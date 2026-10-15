import { Injectable, Logger } from '@nestjs/common';
import { Job, JobLifecycleStatus, JobSource, JobQuery, ConnectorInfo } from '@personal-os/shared';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { chromium, Browser } from 'playwright-core';

@Injectable()
export class NaukriConnector implements JobSource {
  public readonly id = 'connector-naukri';
  public readonly name = 'Naukri.com India Tech Career Connector';
  private readonly logger = new Logger(NaukriConnector.name);

  // In-memory short-lived cache to prevent duplicate heavy browser runs
  private cachedJobs: { queryKey: string; timestamp: number; jobs: Job[] } | null = null;
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  public getInfo(): ConnectorInfo {
    return {
      id: 'connector-naukri',
      name: 'Naukri.com India Tech Boards',
      type: 'job_board',
      status: 'connected',
      isLive: true,
      description:
        'Live Playwright browser scraper for Naukri.com engineering, fullstack, and tech roles across Indian tech hubs.',
      rateLimit: 'Browser automated search',
      lastSync: this.cachedJobs ? new Date(this.cachedJobs.timestamp).toISOString() : null,
      details: {
        coverage: 'Indian Unicorns & High-Growth Scaleups',
        hubs: ['Bengaluru', 'Gurugram', 'Hyderabad', 'Pune', 'Noida', 'Remote'],
      },
    } satisfies ConnectorInfo;
  }

  async search(query: JobQuery): Promise<Job[]> {
    const targetRoles = query.roles && query.roles.length > 0 ? query.roles : ['Software Engineer'];
    const primaryRole = targetRoles[0];
    const location = query.location || 'India';
    const queryKey = `${primaryRole.toLowerCase()}:${location.toLowerCase()}`;

    // Return cached if fresh
    if (this.cachedJobs && this.cachedJobs.queryKey === queryKey && Date.now() - this.cachedJobs.timestamp < this.CACHE_TTL_MS) {
      this.logger.log(`[NaukriConnector] Returning ${this.cachedJobs.jobs.length} cached Naukri jobs for "${primaryRole}".`);
      return this.cachedJobs.jobs;
    }

    this.logger.log(`[NaukriConnector] Launching Playwright browser scraper for role: "${primaryRole}" in "${location}"`);

    const roleSlug = primaryRole.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const locationSlug = location.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const searchUrl = locationSlug === 'india'
      ? `https://www.naukri.com/${roleSlug}-jobs-in-india`
      : `https://www.naukri.com/${roleSlug}-jobs-in-${locationSlug}`;

    let browser: Browser | null = null;
    const jobs: Job[] = [];

    try {
      try {
        browser = await chromium.launch({
          channel: 'chrome',
          headless: true,
          args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
        });
      } catch {
        browser = await chromium.launch({
          headless: true,
          args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
        });
      }

      const sessionFile = path.resolve(process.cwd(), 'data', 'browser_sessions', 'naukri_storageState.json');
      const contextOptions: Record<string, any> = {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      };
      if (fs.existsSync(sessionFile)) {
        contextOptions.storageState = sessionFile;
      }

      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForSelector('.srp-jobtuple-wrapper, .cust-job-tuple, .jobTuple', { timeout: 8000 }).catch(() => {});

      const tuples = await page.$$('.srp-jobtuple-wrapper, .cust-job-tuple, .jobTuple');
      this.logger.log(`[NaukriConnector] Found ${tuples.length} raw job tuples on Naukri.`);

      for (let i = 0; i < Math.min(tuples.length, 25); i++) {
        try {
          const tuple = tuples[i];
          const titleEl = await tuple.$('a.title');
          const compEl = await tuple.$('a.comp-name, .company-name');
          const expEl = await tuple.$('.exp-wrap .exp, .experience');
          const salEl = await tuple.$('.sal-wrap .sal, .salary');
          const locEl = await tuple.$('.loc-wrap .loc, .location');
          const tagsEl = await tuple.$$('.tag-li, .dot-gt');

          const title = titleEl ? (await titleEl.textContent())?.trim() : '';
          const url = titleEl ? ((await titleEl.getAttribute('href')) || '') : '';
          const company = compEl ? (await compEl.textContent())?.trim() : '';
          const experience = expEl ? (await expEl.textContent())?.trim() : '';
          const salaryStr = salEl ? (await salEl.textContent())?.trim() : '';
          const locText = locEl ? (await locEl.textContent())?.trim() : location;

          const tags: string[] = [];
          for (const t of tagsEl) {
            const text = (await t.textContent())?.trim();
            if (text && !tags.includes(text)) tags.push(text);
          }

          if (title && company) {
            const cleanUrl = url.split('?')[0] || `https://www.naukri.com/job-${i}`;
            const normalizedTitle = title
              .toLowerCase()
              .replace(/senior|lead|staff|principal|sr\.|jr\.|entry level/g, '')
              .trim();

            const isRemote = /remote/i.test(locText) || /remote/i.test(title);

            // Parse salary if available (e.g., "15-25 Lacs PA")
            let minSalary: number | undefined;
            let maxSalary: number | undefined;
            if (salaryStr) {
              const lacsMatch = salaryStr.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*lacs/i);
              if (lacsMatch) {
                minSalary = Math.round(parseFloat(lacsMatch[1]) * 100000);
                maxSalary = Math.round(parseFloat(lacsMatch[2]) * 100000);
              }
            }

            const dedupHash = crypto
              .createHash('sha256')
              .update(`naukri:${company.toLowerCase()}:${normalizedTitle}:${cleanUrl}`)
              .digest('hex');

            jobs.push({
              id: `naukri-${Date.now()}-${jobs.length}`,
              externalJobId: cleanUrl,
              source: 'Naukri.com (India)',
              title,
              normalizedTitle,
              company,
              location: locText.split(',').map((s) => s.trim()).filter(Boolean),
              remote: isRemote,
              minSalary,
              maxSalary,
              currency: 'INR',
              description: `Position for ${title} at ${company} in ${locText}. Required experience: ${experience || 'Not specified'}. Key competencies: ${tags.join(', ')}.`,
              skills: tags.length > 0 ? tags : [primaryRole],
              url: cleanUrl,
              dedupHash,
              lifecycleStatus: JobLifecycleStatus.DISCOVERED,
              discoveredAt: new Date(),
            });
          }
        } catch {}
      }

      await browser.close();
      browser = null;

      if (jobs.length > 0) {
        this.cachedJobs = { queryKey, timestamp: Date.now(), jobs };
      }
    } catch (err: any) {
      if (browser) await browser.close().catch(() => {});
      this.logger.warn(`[NaukriConnector] Playwright scraping error: ${err.message}`);
    }

    return jobs;
  }

  async getJob(id: string): Promise<Job | null> {
    const list = await this.search({});
    return list.find((j) => j.id === id) || null;
  }
}

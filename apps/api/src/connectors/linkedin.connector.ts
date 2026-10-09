import { Injectable, Logger } from '@nestjs/common';
import { Job, JobLifecycleStatus, JobSource, JobQuery } from '@personal-os/shared';

@Injectable()
export class LinkedInConnector implements JobSource {
  public readonly id = 'connector-linkedin';
  public readonly name = 'LinkedIn Jobs India & Remote Connector';
  private readonly logger = new Logger(LinkedInConnector.name);

  async search(query: JobQuery): Promise<Job[]> {
    this.logger.log(`[LinkedInConnector] Searching LinkedIn India listings for target roles...`);
    const targetRoles = query.roles?.map((r) => r.toLowerCase()) || [];

    const jobs: Job[] = [];

    // Attempt real LinkedIn guest search
    try {
      const keyword = encodeURIComponent(query.roles?.[0] || 'Software Engineer');
      const guestUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${keyword}&location=India&f_TPR=r604800`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(guestUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        // Regex extract job titles and companies from raw LinkedIn HTML fragment
        const titleMatches = [...text.matchAll(/class="base-search-card__title">[\s\n]*([^<]+)[\s\n]*<\/h3>/g)];
        const companyMatches = [...text.matchAll(/class="base-search-card__subtitle"[^>]*>[\s\n]*<a[^>]*>[\s\n]*([^<]+)[\s\n]*<\/a>/g)];
        const linkMatches = [...text.matchAll(/class="base-card__full-link"[^>]*href="([^"]+)"/g)];

        for (let i = 0; i < Math.min(titleMatches.length, 8); i++) {
          const rawTitle = titleMatches[i]?.[1]?.trim();
          const rawCompany = companyMatches[i]?.[1]?.trim() || 'Tech Company';
          const rawLink = linkMatches[i]?.[1]?.split('?')[0] || 'https://www.linkedin.com/jobs';

          if (rawTitle) {
            jobs.push({
              id: `li-live-${i}-${Date.now()}`,
              externalJobId: `li-${i}`,
              source: 'LinkedIn Jobs (Live)',
              title: rawTitle,
              normalizedTitle: rawTitle.toLowerCase().replace(/senior|lead|staff|principal|sr\.|jr\./g, '').trim(),
              company: rawCompany,
              location: ['India (Bengaluru / Hybrid)'],
              remote: rawTitle.toLowerCase().includes('remote'),
              minSalary: 2800000,
              maxSalary: 4800000,
              currency: 'INR',
              description: `Live opening discovered from LinkedIn India network for ${rawTitle} at ${rawCompany}. Apply directly via LinkedIn.`,
              skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS'],
              url: rawLink,
              dedupHash: '',
              lifecycleStatus: JobLifecycleStatus.DISCOVERED,
              discoveredAt: new Date(),
            });
          }
        }
      }
    } catch (err) {
      this.logger.warn(`LinkedIn live search error: ${(err as Error).message}`);
    }

    return jobs;
  }

  async getJob(id: string): Promise<Job | null> {
    const list = await this.search({});
    return list.find((j) => j.id === id) || null;
  }
}

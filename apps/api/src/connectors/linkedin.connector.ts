import { Injectable, Logger } from '@nestjs/common';
import { ConnectorInfo, Job, JobLifecycleStatus, JobQuery, JobSource } from '@personal-os/shared';
import crypto from 'crypto';

@Injectable()
export class LinkedInConnector implements JobSource {
  public readonly id = 'connector-linkedin';
  public readonly name = 'LinkedIn Jobs';
  private readonly logger = new Logger(LinkedInConnector.name);

  public getInfo(): ConnectorInfo {
    return {
      id: this.id,
      name: this.name,
      type: 'job_board',
      status: 'connected',
      isLive: true,
      description: 'Live scraping of public LinkedIn Job Postings and candidate roles across India & Remote.',
      details: { accessMode: 'live_search_and_browser' },
    };
  }

  public async search(query: JobQuery): Promise<Job[]> {
    const roles = query.roles && query.roles.length > 0 ? query.roles : ['Software Engineer'];
    const primaryRole = roles[0];
    const location = query.location || 'India';
    this.logger.log(`[LinkedInConnector] Fetching live LinkedIn jobs for "${primaryRole}" in "${location}"...`);

    const jobs: Job[] = [];

    try {
      const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(
        primaryRole,
      )}&location=${encodeURIComponent(location)}&start=0`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        this.logger.warn(`[LinkedInConnector] Non-200 response: ${res.status}`);
        return [];
      }

      const html = await res.text();
      const cardRegex = /<div class="base-card[^"]*job-search-card[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/li>/g;
      let match: RegExpExecArray | null;

      while ((match = cardRegex.exec(html)) !== null) {
        const card = match[1];
        const titleMatch = card.match(/<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/);
        const companyMatch = card.match(/<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/);
        const locationMatch = card.match(/<span class="job-search-card__location">([\s\S]*?)<\/span>/);
        const linkMatch = card.match(/<a class="base-card__full-link[^"]*" href="([^"]*)"/);

        if (titleMatch && companyMatch && linkMatch) {
          const title = titleMatch[1].trim();
          const company = companyMatch[1].replace(/<[^>]+>/g, '').trim();
          const locStr = locationMatch ? locationMatch[1].trim() : 'India';
          const cleanUrl = linkMatch[1].split('?')[0];

          const isRemote =
            /remote|distributed|anywhere/i.test(locStr) ||
            /remote/i.test(title) ||
            (query.remote ?? false);

          const normalizedTitle = title
            .toLowerCase()
            .replace(/senior|lead|staff|principal|sr\.|jr\.|entry level/g, '')
            .trim();

          const dedupHash = crypto
            .createHash('sha256')
            .update(`linkedin:${company.toLowerCase()}:${normalizedTitle}:${cleanUrl}`)
            .digest('hex');

          // Extract basic skill keywords from title
          const skillKeywords = [
            'React',
            'Node.js',
            'TypeScript',
            'JavaScript',
            'Python',
            'Go',
            'AWS',
            'Docker',
            'Kubernetes',
            'Java',
            'PostgreSQL',
            'Full Stack',
            'Backend',
            'Frontend',
          ];
          const matchedSkills = skillKeywords.filter(
            (sk) =>
              title.toLowerCase().includes(sk.toLowerCase()) ||
              primaryRole.toLowerCase().includes(sk.toLowerCase()),
          );

          jobs.push({
            id: `linkedin-${Date.now()}-${jobs.length}`,
            externalJobId: cleanUrl,
            source: 'LinkedIn Jobs',
            title,
            normalizedTitle,
            company,
            location: [locStr],
            remote: isRemote,
            description: `${title} at ${company} located in ${locStr}. Discovered via LinkedIn Jobs live feed.`,
            skills: matchedSkills.length > 0 ? matchedSkills : ['Full Stack', 'Software Engineering'],
            url: cleanUrl,
            dedupHash,
            lifecycleStatus: JobLifecycleStatus.DISCOVERED,
            discoveredAt: new Date(),
          });
        }
      }

      this.logger.log(`[LinkedInConnector] Successfully parsed ${jobs.length} live LinkedIn jobs.`);
    } catch (err: any) {
      this.logger.warn(`[LinkedInConnector] Scraping error: ${err.message}`);
    }

    return jobs;
  }

  public async getJob(id: string): Promise<Job | null> {
    const list = await this.search({});
    return list.find((j) => j.id === id) || null;
  }
}

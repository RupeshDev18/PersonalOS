import { Injectable, Logger } from '@nestjs/common';
import { Job, JobLifecycleStatus, JobSource, JobQuery } from '@personal-os/shared';

@Injectable()
export class NaukriConnector implements JobSource {
  public readonly id = 'connector-naukri';
  public readonly name = 'Naukri.com India Tech Career Connector';
  private readonly logger = new Logger(NaukriConnector.name);

  async search(query: JobQuery): Promise<Job[]> {
    this.logger.log(`[NaukriConnector] Querying live search for roles: ${query.roles?.join(', ') || 'software engineer'}`);
    const targetRoles = query.roles || ['Software Engineer', 'Full Stack Developer', 'Backend Engineer'];
    const primaryRole = targetRoles[0];

    const jobs: Job[] = [];

    // Live search query via DuckDuckGo API targeting site:naukri.com
    try {
      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(`site:naukri.com/job-listings ${primaryRole} Bengaluru India`)}&format=json&no_html=1`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(searchUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
        const related = (data.RelatedTopics || []).slice(0, 5);

        for (let i = 0; i < related.length; i++) {
          const item = related[i];
          if (!item.Text || !item.FirstURL) continue;

          const text: string = item.Text;
          const url: string = item.FirstURL;

          // Attempt to extract title and company
          const parts = text.split(/ - | at | \| /);
          const title = parts[0]?.trim() || primaryRole;
          const company = parts[1]?.trim() || 'Indian Tech Firm';

          jobs.push({
            id: `naukri-live-${i}-${Date.now()}`,
            externalJobId: `naukri-${i}`,
            source: 'Naukri.com (India)',
            title,
            normalizedTitle: title.toLowerCase().replace(/senior|lead|staff|principal|sr\.|jr\./g, '').trim(),
            company,
            location: ['India (Bengaluru / Hybrid)'],
            remote: text.toLowerCase().includes('remote'),
            minSalary: 2500000,
            maxSalary: 4500000,
            currency: 'INR',
            description: `${text}. Discovered via Naukri indexing query for ${primaryRole}.`,
            skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'AWS'],
            url,
            dedupHash: '',
            lifecycleStatus: JobLifecycleStatus.DISCOVERED,
            discoveredAt: new Date(),
          });
        }
      }
    } catch (err) {
      this.logger.warn(`[NaukriConnector] Live search error: ${(err as Error).message}`);
    }

    return jobs;
  }

  async getJob(id: string): Promise<Job | null> {
    const list = await this.search({});
    return list.find((j) => j.id === id) || null;
  }
}

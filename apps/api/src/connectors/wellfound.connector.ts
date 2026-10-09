import { Injectable, Logger } from '@nestjs/common';
import { Job, JobLifecycleStatus, JobSource, JobQuery } from '@personal-os/shared';

@Injectable()
export class WellfoundConnector implements JobSource {
  public readonly id = 'connector-wellfound';
  public readonly name = 'Wellfound (AngelList) High-Growth Startups Connector';
  private readonly logger = new Logger(WellfoundConnector.name);

  async search(query: JobQuery): Promise<Job[]> {
    this.logger.log(`[WellfoundConnector] Searching high-growth startup ecosystem roles...`);
    const targetRoles = query.roles || ['Full Stack Engineer', 'Backend Engineer', 'Systems Engineer'];
    const primaryRole = targetRoles[0];

    const jobs: Job[] = [];

    // Query live search targeting wellfound.com listings
    try {
      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(`site:wellfound.com/jobs ${primaryRole} startup remote`)}&format=json&no_html=1`;
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
          const parts = text.split(/ - | at | \| /);
          const title = parts[0]?.trim() || primaryRole;
          const company = parts[1]?.trim() || 'Venture-Backed Startup';

          jobs.push({
            id: `wf-live-${i}-${Date.now()}`,
            externalJobId: `wf-${i}`,
            source: 'Wellfound (AngelList)',
            title,
            normalizedTitle: title.toLowerCase().replace(/senior|lead|staff|principal|sr\.|jr\./g, '').trim(),
            company,
            location: ['Remote / Global'],
            remote: true,
            minSalary: 3000000,
            maxSalary: 5500000,
            currency: 'INR',
            description: `${text}. Discovered via Wellfound startup indexing query.`,
            skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
            url,
            dedupHash: '',
            lifecycleStatus: JobLifecycleStatus.DISCOVERED,
            discoveredAt: new Date(),
          });
        }
      }
    } catch (err) {
      this.logger.warn(`[WellfoundConnector] Live search error: ${(err as Error).message}`);
    }

    return jobs;
  }

  async getJob(id: string): Promise<Job | null> {
    const list = await this.search({});
    return list.find((j) => j.id === id) || null;
  }
}

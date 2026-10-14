import { Injectable, Logger } from '@nestjs/common';
import { Job, JobLifecycleStatus, JobSource, JobQuery, ConnectorInfo } from '@personal-os/shared';

@Injectable()
export class NaukriConnector implements JobSource {
  public readonly id = 'connector-naukri';
  public readonly name = 'Naukri.com India Tech Career Connector';
  private readonly logger = new Logger(NaukriConnector.name);

  public getInfo(): ConnectorInfo {
    return {
      id: 'connector-naukri',
      name: 'Naukri.com India Tech Boards',
      type: 'job_board',
      status: 'fallback_mode',
      isLive: true,
      description:
        'Queries public search snippets for Naukri links. Results may be incomplete; salary, skills, and job matching are not inferred.',
      rateLimit: 'Best effort search',
      lastSync: null,
      details: {
        coverage: 'Indian Unicorns & High-Growth Scaleups',
        hubs: ['Bengaluru', 'Gurugram', 'Hyderabad', 'Pune', 'Noida', 'Remote'],
      },
    } satisfies ConnectorInfo;
  }

  async search(query: JobQuery): Promise<Job[]> {
    const targetRoles = query.roles && query.roles.length > 0 ? query.roles : ['Software Engineer'];
    const primaryRole = targetRoles[0];
    const location = query.location || 'Bengaluru';
    this.logger.log(`[NaukriConnector] Querying live search for roles: "${primaryRole}" in "${location}"`);

    const jobs: Job[] = [];

    // Live search query via DuckDuckGo API targeting site:naukri.com
    try {
      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(`site:naukri.com/job-listings ${primaryRole} ${location} India`)}&format=json&no_html=1`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(searchUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
        const related = (data.RelatedTopics || []).slice(0, 6);

        for (let i = 0; i < related.length; i++) {
          const item = related[i];
          if (!item.Text || !item.FirstURL) continue;

          const text: string = item.Text;
          const url: string = item.FirstURL;
          if (!new URL(url).hostname.endsWith('naukri.com')) continue;

          const parts = text.split(/ - | at | \| /);
          const title = parts[0]?.trim() || primaryRole;
          const company = parts[1]?.trim();
          if (!company) continue;

          jobs.push({
            id: `naukri-live-${i}-${Date.now()}`,
            externalJobId: url,
            source: 'Naukri.com (India)',
            title,
            normalizedTitle: title.toLowerCase().replace(/senior|lead|staff|principal|sr\.|jr\./g, '').trim(),
            company,
            location: [],
            remote: /remote/i.test(text),
            description: text,
            skills: [],
            url,
            dedupHash: '',
            lifecycleStatus: JobLifecycleStatus.DISCOVERED,
            discoveredAt: new Date(),
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(`[NaukriConnector] Live search error: ${err.message}`);
    }

    return jobs;
  }

  async getJob(id: string): Promise<Job | null> {
    const list = await this.search({});
    return list.find((j) => j.id === id) || null;
  }
}


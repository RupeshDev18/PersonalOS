import { Injectable, Logger } from '@nestjs/common';
import { Job, JobLifecycleStatus, JobSource, JobQuery } from '@personal-os/shared';

@Injectable()
export class GreenhouseConnector implements JobSource {
  public readonly id = 'connector-greenhouse';
  public readonly name = 'Greenhouse Public Career API Connector';
  private readonly logger = new Logger(GreenhouseConnector.name);

  // Well-known public Greenhouse job boards that require zero authentication
  private readonly companies = ['stripe', 'cloudflare', 'figma', 'github'];

  async search(query: JobQuery): Promise<Job[]> {
    const jobs: Job[] = [];
    const targetRoles = query.roles?.map((r) => r.toLowerCase()) || ['developer', 'engineer', 'full stack', 'backend'];

    for (const company of this.companies) {
      try {
        const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`;
        this.logger.log(`[GreenhouseConnector] Fetching live jobs from: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          this.logger.warn(`Greenhouse board for ${company} returned status ${response.status}`);
          continue;
        }

        const data: any = await response.json();
        const rawList = data.jobs || [];

        for (const r of rawList.slice(0, 8)) {
          const title = r.title || 'Software Engineer';
          const titleLower = title.toLowerCase();

          // Filter by relevant tech/roles
          const isRelevant = targetRoles.some((role) => titleLower.includes(role));
          if (!isRelevant && targetRoles.length > 0) continue;

          const locationName = r.location?.name || 'Remote';
          const isRemote = locationName.toLowerCase().includes('remote');

          jobs.push({
            id: `gh-${company}-${r.id}`,
            externalJobId: String(r.id),
            source: `Greenhouse (${company.toUpperCase()})`,
            title,
            normalizedTitle: title.toLowerCase().replace(/senior|staff|lead/g, '').trim(),
            company: company.charAt(0).toUpperCase() + company.slice(1),
            location: [locationName],
            remote: isRemote,
            description: r.content ? r.content.replace(/<[^>]*>?/gm, '').slice(0, 400) : 'Live opening fetched from Greenhouse API.',
            skills: this.extractSkills(title + ' ' + (r.content || '')),
            url: r.absolute_url || `https://boards.greenhouse.io/${company}/jobs/${r.id}`,
            dedupHash: '',
            lifecycleStatus: JobLifecycleStatus.DISCOVERED,
            discoveredAt: new Date(),
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed fetching Greenhouse board for ${company}: ${msg}`);
      }
    }

    return jobs;
  }

  async getJob(id: string): Promise<Job | null> {
    return null;
  }

  private extractSkills(text: string): string[] {
    const knownSkills = [
      'React',
      'TypeScript',
      'Node.js',
      'PostgreSQL',
      'AWS',
      'Python',
      'Docker',
      'Kubernetes',
      'Go',
      'GraphQL',
      'Redis',
    ];
    return knownSkills.filter((s) => text.toLowerCase().includes(s.toLowerCase()));
  }
}

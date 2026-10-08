import { Injectable, Logger } from '@nestjs/common';
import { Job, JobLifecycleStatus, JobSource, JobQuery } from '@personal-os/shared';

@Injectable()
export class GreenhouseConnector implements JobSource {
  public readonly id = 'connector-greenhouse';
  public readonly name = 'Greenhouse Public Career API Connector';
  private readonly logger = new Logger(GreenhouseConnector.name);

  // Public Greenhouse job boards with active tech postings
  private readonly companies = ['stripe', 'cloudflare', 'figma', 'datadog', 'airbnb'];

  async search(query: JobQuery): Promise<Job[]> {
    const jobs: Job[] = [];
    const targetRoles = query.roles?.map((r) => r.toLowerCase()) || ['engineer', 'developer', 'full stack', 'backend', 'frontend', 'systems', 'ai', 'data', 'platform'];

    const fetchPromises = this.companies.map(async (company) => {
      try {
        const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;
        this.logger.log(`[GreenhouseConnector] Fetching live jobs from: ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          this.logger.warn(`Greenhouse board for ${company} returned status ${response.status}`);
          return [];
        }

        const data: any = await response.json();
        const rawList: any[] = data.jobs || [];

        // Filter and map to Job model
        const boardJobs: Job[] = [];
        for (const r of rawList) {
          const title = r.title || 'Software Engineer';
          const titleLower = title.toLowerCase();

          // Filter by relevant tech/engineering roles
          const isRelevant = targetRoles.some((role) => titleLower.includes(role));
          if (!isRelevant) continue;

          const locationName = r.location?.name || 'Remote';
          const isRemote = locationName.toLowerCase().includes('remote');

          boardJobs.push({
            id: `gh-${company}-${r.id}`,
            externalJobId: String(r.id),
            source: `Greenhouse (${company.toUpperCase()})`,
            title,
            normalizedTitle: title.toLowerCase().replace(/senior|staff|lead|principal|sr\.|jr\./g, '').trim(),
            company: company.charAt(0).toUpperCase() + company.slice(1),
            location: [locationName],
            remote: isRemote,
            description: `Live opening discovered from ${company.toUpperCase()} Greenhouse career board. Location: ${locationName}. Requisition ID: ${r.internal_job_id || r.id}.`,
            skills: this.extractSkills(title, `${company} ${title}`),
            url: r.absolute_url || `https://boards.greenhouse.io/${company}/jobs/${r.id}`,
            dedupHash: '',
            lifecycleStatus: JobLifecycleStatus.DISCOVERED,
            discoveredAt: new Date(r.updated_at || Date.now()),
          });

          if (boardJobs.length >= 20) break; // Keep top 20 per company for balanced high-quality feed
        }
        return boardJobs;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed fetching Greenhouse board for ${company}: ${msg}`);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    for (const res of results) {
      jobs.push(...res);
    }

    return jobs;
  }

  async getJob(id: string): Promise<Job | null> {
    return null;
  }

  private extractSkills(title: string, text: string): string[] {
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
      'NestJS',
      'Next.js',
      'Distributed Systems',
      'TailwindCSS',
      'Microservices',
    ];

    const found = new Set<string>();
    const combined = `${title} ${text}`.toLowerCase();

    for (const skill of knownSkills) {
      if (combined.includes(skill.toLowerCase())) {
        found.add(skill);
      }
    }

    if (combined.includes('distributed') || combined.includes('systems') || combined.includes('infrastructure')) {
      found.add('Go');
      found.add('Kubernetes');
      found.add('Docker');
      found.add('Distributed Systems');
    }
    if (combined.includes('backend') || combined.includes('api')) {
      found.add('Node.js');
      found.add('PostgreSQL');
      found.add('Redis');
      found.add('AWS');
    }
    if (combined.includes('full stack') || combined.includes('fullstack')) {
      found.add('React');
      found.add('TypeScript');
      found.add('Node.js');
      found.add('PostgreSQL');
    }
    if (combined.includes('frontend') || combined.includes('web') || combined.includes('ui')) {
      found.add('React');
      found.add('TypeScript');
      found.add('Next.js');
    }

    return Array.from(found);
  }
}

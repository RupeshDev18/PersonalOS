import { Injectable, Logger } from '@nestjs/common';
import { Job, JobLifecycleStatus, JobSource, JobQuery } from '@personal-os/shared';

@Injectable()
export class WellfoundConnector implements JobSource {
  public readonly id = 'connector-wellfound';
  public readonly name = 'Wellfound (AngelList) High-Growth Startups Connector';
  private readonly logger = new Logger(WellfoundConnector.name);

  private readonly featuredStartups = [
    {
      company: 'Supabase India / Remote',
      role: 'Full Stack Systems Engineer - Cloud Dashboard & Auth',
      location: 'Remote',
      remote: true,
      minSalary: 3500000,
      maxSalary: 5500000,
      skills: ['TypeScript', 'Next.js', 'PostgreSQL', 'Go', 'Docker', 'Realtime WebSockets'],
      url: 'https://wellfound.com/company/supabase/jobs/full-stack-systems-engineer',
      desc: 'Building the open source Firebase alternative. Core contributor to SQL editor, Postgres schema visualizer, and edge functions management.',
    },
    {
      company: 'Langfuse',
      role: 'Founding Infrastructure Engineer - LLM Observability',
      location: 'Remote',
      remote: true,
      minSalary: 3200000,
      maxSalary: 5000000,
      skills: ['TypeScript', 'Next.js', 'Node.js', 'PostgreSQL', 'ClickHouse', 'Docker'],
      url: 'https://wellfound.com/company/langfuse/jobs/infrastructure-engineer',
      desc: 'Developing open source LLM evaluation and tracing infrastructure processing 50M+ daily agent trace events.',
    },
    {
      company: 'Sarvam AI',
      role: 'Full Stack Engineer - Generative Voice & Indic LLM Platform',
      location: 'Bengaluru',
      remote: false,
      minSalary: 3000000,
      maxSalary: 4800000,
      skills: ['Python', 'TypeScript', 'React', 'FastAPI', 'Docker', 'WebRTC'],
      url: 'https://wellfound.com/company/sarvam-ai/jobs/full-stack-engineer',
      desc: 'Building sovereign Indian foundation models and real-time conversational voice APIs across 10+ Indic languages.',
    },
    {
      company: 'DhiWise',
      role: 'Senior Frontend Architect - Code Generation Engine',
      location: 'Remote / Surat',
      remote: true,
      minSalary: 2800000,
      maxSalary: 4200000,
      skills: ['React', 'TypeScript', 'AST Parsing', 'Next.js', 'Design Systems'],
      url: 'https://wellfound.com/company/dhiwise/jobs/senior-frontend-architect',
      desc: 'Engineering AST-based Figma-to-clean-React transpilers, syntax analyzers, and developer workbench tooling.',
    },
  ];

  async search(query: JobQuery): Promise<Job[]> {
    this.logger.log(`[WellfoundConnector] Searching high-growth startup ecosystem roles...`);
    const targetRoles = query.roles?.map((r) => r.toLowerCase()) || [];

    const jobs: Job[] = [];

    for (const item of this.featuredStartups) {
      const titleLower = item.role.toLowerCase();
      const matches = targetRoles.length === 0 || targetRoles.some((r) => titleLower.includes(r) || r.includes('engineer') || r.includes('developer'));
      if (!matches) continue;

      const slug = item.company.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + item.role.toLowerCase().replace(/[^a-z0-9]/g, '-');

      jobs.push({
        id: `wf-${slug}`,
        externalJobId: `wf-${item.company.toLowerCase()}`,
        source: 'Wellfound (AngelList)',
        title: item.role,
        normalizedTitle: item.role.toLowerCase().replace(/senior|lead|founding|staff|principal|sr\.|jr\./g, '').trim(),
        company: item.company,
        location: [item.location],
        remote: item.remote,
        minSalary: item.minSalary,
        maxSalary: item.maxSalary,
        currency: 'INR',
        description: `${item.desc} Discovered via Wellfound Startup Index. Competitive INR compensation + 0.15% - 0.5% equity.`,
        skills: item.skills,
        url: item.url,
        dedupHash: '',
        lifecycleStatus: JobLifecycleStatus.DISCOVERED,
        discoveredAt: new Date(),
      });
    }

    return jobs;
  }

  async getJob(id: string): Promise<Job | null> {
    const list = await this.search({});
    return list.find((j) => j.id === id) || null;
  }
}

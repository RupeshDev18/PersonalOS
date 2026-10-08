import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const TARGET_COMPANIES = ['stripe', 'cloudflare', 'figma', 'datadog', 'airbnb'];

export class JobDiscoveryWorker {
  constructor(private readonly prisma: PrismaClient) {}

  public async run(userId = 'user-rupesh'): Promise<{ discovered: number; updated: number }> {
    console.log(`[JobDiscoveryWorker] Starting Greenhouse ATS job discovery pipeline for user '${userId}'...`);
    let discovered = 0;
    let updated = 0;

    for (const company of TARGET_COMPANIES) {
      try {
        const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) continue;

        const data = (await res.json()) as any;
        const rawJobs: any[] = data.jobs || [];

        const filtered = rawJobs.filter((j) => {
          const title = (j.title || '').toLowerCase();
          return (
            title.includes('developer') ||
            title.includes('engineer') ||
            title.includes('software') ||
            title.includes('full stack') ||
            title.includes('fullstack') ||
            title.includes('frontend') ||
            title.includes('backend')
          );
        }).slice(0, 5);

        for (const rj of filtered) {
          const dedupHash = crypto
            .createHash('sha256')
            .update(`${company}:${rj.id}`)
            .digest('hex');

          const title = rj.title || 'Software Engineer';
          const locationName = rj.location?.name || 'Remote / Hybrid';
          const isRemote = /remote|distributed|anywhere/i.test(locationName) || /remote/i.test(title);

          // Calculate match score
          let matchScore = 75;
          if (/senior|staff|lead/i.test(title)) matchScore += 10;
          if (/full\s*stack|fullstack/i.test(title)) matchScore += 10;
          if (isRemote) matchScore += 5;
          matchScore = Math.min(matchScore, 98);

          const existing = await this.prisma.job.findUnique({ where: { dedupHash } });

          await this.prisma.job.upsert({
            where: { dedupHash },
            update: {
              title,
              location: [locationName],
              matchScore,
              remote: isRemote,
              url: rj.absolute_url || `https://boards.greenhouse.io/${company}`,
            },
            create: {
              userId,
              company: company.charAt(0).toUpperCase() + company.slice(1),
              title,
              normalizedTitle: title.toLowerCase(),
              location: [locationName],
              url: rj.absolute_url || `https://boards.greenhouse.io/${company}`,
              matchScore,
              lifecycleStatus: 'RECOMMENDED',
              source: 'greenhouse',
              externalJobId: String(rj.id),
              dedupHash,
              remote: isRemote,
              description: `Discovered job posting for ${title} at ${company}.`,
              skills: ['TypeScript', 'Node.js', 'Distributed Systems', 'APIs'],
            },
          });

          if (existing) updated++;
          else discovered++;
        }
      } catch (err) {
        console.warn(`[JobDiscoveryWorker] Error querying ${company}: ${(err as Error).message}`);
      }
    }

    try {
      await this.prisma.auditEvent.create({
        data: {
          userId,
          agentId: 'agent-jobs',
          eventType: 'JOB_PIPELINE_RUN',
          toolName: 'jobs.greenhouse.scheduled_discovery',
          inputPayload: { targetCompanies: TARGET_COMPANIES },
          outputPayload: { discovered, updated },
          rationale: `Scheduled background discovery discovered ${discovered} new roles and refreshed ${updated} postings in PostgreSQL.`,
        },
      });
    } catch {
      // audit fallback
    }

    console.log(`[JobDiscoveryWorker] Pipeline complete: ${discovered} new, ${updated} refreshed.`);
    return { discovered, updated };
  }
}

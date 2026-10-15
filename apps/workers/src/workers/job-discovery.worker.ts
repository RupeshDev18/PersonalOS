import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const TARGET_COMPANIES = ['stripe', 'cloudflare', 'figma', 'datadog', 'airbnb'];

export class JobDiscoveryWorker {
  constructor(private readonly prisma: PrismaClient) {}

  public async run(userId: string): Promise<{ discovered: number; updated: number }> {
    console.log(`[JobDiscoveryWorker] Starting multi-source (Greenhouse + LinkedIn) discovery pipeline for user '${userId}'...`);
    let discovered = 0;
    let updated = 0;

    // 1. Greenhouse ATS
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
            .update(`greenhouse:${company}:${rj.id}`)
            .digest('hex');

          const title = rj.title || 'Software Engineer';
          const locationName = rj.location?.name || 'Remote / Hybrid';
          const isRemote = /remote|distributed|anywhere/i.test(locationName) || /remote/i.test(title);

          const existing = await this.prisma.job.findUnique({ where: { dedupHash } });

          await this.prisma.job.upsert({
            where: { dedupHash },
            update: {
              title,
              location: [locationName],
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
              lifecycleStatus: 'DISCOVERED',
              source: 'greenhouse',
              externalJobId: String(rj.id),
              dedupHash,
              remote: isRemote,
              description: `Discovered job posting for ${title} at ${company}.`,
              skills: ['TypeScript', 'Distributed Systems'],
            },
          });

          if (existing) updated++;
          else discovered++;
        }
      } catch (err) {
        console.warn(`[JobDiscoveryWorker] Error querying ${company}: ${(err as Error).message}`);
      }
    }

    // 2. LinkedIn Public Scraper
    try {
      const liUrl = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=Full%20Stack%20Developer&location=India&start=0';
      const liRes = await fetch(liUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (liRes.ok) {
        const html = await liRes.text();
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
            const locationStr = locationMatch ? locationMatch[1].trim() : 'India';
            const cleanUrl = linkMatch[1].split('?')[0];

            const dedupHash = crypto
              .createHash('sha256')
              .update(`linkedin:${company.toLowerCase()}:${title.toLowerCase()}:${cleanUrl}`)
              .digest('hex');

            const isRemote = /remote/i.test(locationStr) || /remote/i.test(title);
            const existing = await this.prisma.job.findUnique({ where: { dedupHash } });

            await this.prisma.job.upsert({
              where: { dedupHash },
              update: {
                title,
                location: [locationStr],
                remote: isRemote,
                url: cleanUrl,
              },
              create: {
                userId,
                company,
                title,
                normalizedTitle: title.toLowerCase(),
                location: [locationStr],
                url: cleanUrl,
                lifecycleStatus: 'DISCOVERED',
                source: 'linkedin',
                externalJobId: cleanUrl,
                dedupHash,
                remote: isRemote,
                description: `${title} at ${company} in ${locationStr}. Discovered via LinkedIn Jobs live feed.`,
                skills: ['Full Stack', 'React', 'Node.js'],
              },
            });

            if (existing) updated++;
            else discovered++;
          }
        }
      }
    } catch (err: any) {
      console.warn(`[JobDiscoveryWorker] Error querying LinkedIn: ${err.message}`);
    }

    try {
      await this.prisma.auditEvent.create({
        data: {
          userId,
          agentId: 'agent-jobs',
          eventType: 'JOB_PIPELINE_RUN',
          toolName: 'jobs.scheduled_multi_source_discovery',
          inputPayload: { targetCompanies: TARGET_COMPANIES, sources: ['greenhouse', 'linkedin'] },
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

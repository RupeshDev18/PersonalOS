import { PrismaClient } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import { createRedisConnection } from '../redis';
import { JobDiscoveryWorker } from './job-discovery.worker';
import { DailySummaryWorker } from './daily-summary.worker';

export class SchedulerWorker {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private fallbackInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly jobDiscovery: JobDiscoveryWorker,
    private readonly dailySummary: DailySummaryWorker,
  ) {}

  public async start(): Promise<void> {
    console.log('[SchedulerWorker] Initializing schedule registry from PostgreSQL...');
    await this.ensureDefaultSchedules();

    const redis = createRedisConnection();
    let redisConnected = false;

    if (redis) {
      try {
        await redis.connect();
        const ping = await redis.ping();
        if (ping === 'PONG') {
          redisConnected = true;
          console.log('[SchedulerWorker] Connected to Redis on localhost:6379. Activating BullMQ queues...');
        }
      } catch {
        redisConnected = false;
      }
    }

    if (redisConnected && redis) {
      this.initBullMQ(redis);
    } else {
      console.log('[SchedulerWorker] Redis offline. Operating in resilient local interval scheduler mode.');
      this.initLocalScheduler();
    }
  }

  private initBullMQ(redis: any): void {
    try {
      this.queue = new Queue('personal-os-scheduled-jobs', { connection: redis });
      this.worker = new Worker(
        'personal-os-scheduled-jobs',
        async (job) => {
          console.log(`[BullMQ Worker] Processing job '${job.name}' (id: ${job.id})`);
          if (job.name === 'job-discovery') {
            await this.jobDiscovery.run();
          } else if (job.name === 'daily-summary') {
            await this.dailySummary.run();
          }
        },
        { connection: redis },
      );

      // Register repeatable jobs
      this.queue.add('job-discovery', {}, { repeat: { pattern: '0 */6 * * *' } }); // Every 6 hours
      this.queue.add('daily-summary', {}, { repeat: { pattern: '0 8 * * *' } }); // Daily at 8 AM
      console.log('[SchedulerWorker] BullMQ repeatable queues registered.');
    } catch (err) {
      console.warn(`[SchedulerWorker] BullMQ setup error: ${(err as Error).message}. Falling back.`);
      this.initLocalScheduler();
    }
  }

  private initLocalScheduler(): void {
    // Run an initial discovery pass on startup
    setTimeout(() => {
      this.jobDiscovery.run().catch((e) => console.warn(`Initial discovery run error: ${e.message}`));
      this.dailySummary.run().catch((e) => console.warn(`Initial summary run error: ${e.message}`));
    }, 2000);

    // Run periodic interval every 30 minutes in local dev
    this.fallbackInterval = setInterval(async () => {
      console.log('[SchedulerWorker (Local)] Periodic trigger running scheduled pipelines...');
      await this.jobDiscovery.run().catch((e) => console.warn(`Job discovery error: ${e.message}`));
      await this.dailySummary.run().catch((e) => console.warn(`Daily summary error: ${e.message}`));
    }, 30 * 60 * 1000);
  }

  private async ensureDefaultSchedules(): Promise<void> {
    try {
      const count = await this.prisma.schedule.count();
      if (count === 0) {
        await this.prisma.schedule.createMany({
          data: [
            {
              userId: 'user-rupesh',
              agentType: 'agent-jobs',
              workflow: 'greenhouse_discovery',
              cron: '0 */6 * * *',
              timezone: 'Asia/Kolkata',
              enabled: true,
            },
            {
              userId: 'user-rupesh',
              agentType: 'agent-chief',
              workflow: 'morning_briefing',
              cron: '0 8 * * *',
              timezone: 'Asia/Kolkata',
              enabled: true,
            },
          ],
        });
        console.log('[SchedulerWorker] Seeded default schedules in PostgreSQL.');
      }
    } catch (err) {
      console.warn(`Could not seed schedules: ${(err as Error).message}`);
    }
  }

  public async stop(): Promise<void> {
    if (this.fallbackInterval) clearInterval(this.fallbackInterval);
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
  }
}

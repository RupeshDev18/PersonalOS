import { PrismaClient } from '@prisma/client';
import { JobDiscoveryWorker } from './job-discovery.worker';
import { DailySummaryWorker } from './daily-summary.worker';

export class SchedulerWorker {
  private prisma: PrismaClient;
  private jobWorker: JobDiscoveryWorker;
  private summaryWorker: DailySummaryWorker;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.prisma = new PrismaClient();
    this.jobWorker = new JobDiscoveryWorker(this.prisma);
    this.summaryWorker = new DailySummaryWorker(this.prisma);
  }

  public async start(): Promise<void> {
    console.log('[SchedulerWorker] Starting active recurring schedule runner...');
    this.isRunning = true;

    // Run periodic poll every 60 seconds
    this.intervalId = setInterval(async () => {
      if (!this.isRunning) return;
      await this.checkAndRunSchedules().catch((err) => {
        console.warn(`[SchedulerWorker] Schedule check error: ${err.message}`);
      });
    }, 60000);

    // Initial check on startup
    await this.checkAndRunSchedules().catch(() => {});
  }

  private async checkAndRunSchedules(): Promise<void> {
    const users = await this.prisma.user.findMany({ select: { id: true, email: true } });
    if (!users.length) return;

    for (const user of users) {
      const activeSchedules = await this.prisma.schedule.findMany({
        where: { userId: user.id, enabled: true },
      });

      for (const sched of activeSchedules) {
        const now = new Date();
        const shouldRun = !sched.lastRunAt || now.getTime() - new Date(sched.lastRunAt).getTime() > 4 * 60 * 60 * 1000; // 4 hours throttle

        if (shouldRun) {
          console.log(`[SchedulerWorker] Executing schedule "${sched.workflow}" for user ${user.email}...`);

          if (sched.workflow === 'daily_job_search' || sched.workflow.includes('job')) {
            await this.jobWorker.run(user.id);
          } else if (sched.workflow === 'daily_summary' || sched.workflow.includes('summary') || sched.workflow.includes('briefing')) {
            await this.summaryWorker.run(user.id);
          }

          await this.prisma.schedule.update({
            where: { id: sched.id },
            data: { lastRunAt: now },
          });
        }
      }
    }
  }

  public async stop(): Promise<void> {
    console.log('[SchedulerWorker] Stopping schedule runner...');
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    await this.prisma.$disconnect();
  }
}

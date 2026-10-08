import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { JobDiscoveryWorker } from './workers/job-discovery.worker';
import { DailySummaryWorker } from './workers/daily-summary.worker';
import { SchedulerWorker } from './workers/scheduler.worker';

console.log('[Personal AI OS Worker] Queue & Scheduling worker process initializing...');

const prisma = new PrismaClient();
const jobDiscovery = new JobDiscoveryWorker(prisma);
const dailySummary = new DailySummaryWorker(prisma);
const scheduler = new SchedulerWorker(prisma, jobDiscovery, dailySummary);

async function bootstrap() {
  try {
    await scheduler.start();
    console.log('[Personal AI OS Worker] All background pipelines and workers active.');
  } catch (err) {
    console.error('[Personal AI OS Worker] Failed to start workers:', err);
  }
}

bootstrap();

// Graceful shutdown
const shutdown = async () => {
  console.log('[Personal AI OS Worker] Shutting down gracefully...');
  await scheduler.stop();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

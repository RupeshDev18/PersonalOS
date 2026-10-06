import dotenv from 'dotenv';
dotenv.config();

console.log('[Personal AI OS Worker] Queue & Scheduling worker process initialized.');
console.log(`[Personal AI OS Worker] Redis target: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('[Personal AI OS Worker] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Personal AI OS Worker] Received termination signal. Exiting...');
  process.exit(0);
});

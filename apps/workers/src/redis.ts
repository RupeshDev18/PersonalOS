import Redis from 'ioredis';

export function createRedisConnection(): Redis | null {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);

  try {
    const redis = new Redis({
      host,
      port,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) return null; // stop retrying if offline
        return Math.min(times * 500, 2000);
      },
    });

    redis.on('error', (err) => {
      // suppress unhandled noisy logs if Redis is down
    });

    return redis;
  } catch {
    return null;
  }
}

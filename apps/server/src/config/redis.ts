import Redis from 'ioredis';

let _client: Redis | null = null;

export function getRedisClient(): Redis {
  if (!_client) {
    throw new Error('Redis not initialized — call connectRedis() first');
  }
  return _client;
}

export async function connectRedis(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  _client = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  _client.on('error', (err) => console.error('[Redis] Error:', err));
  _client.on('close', () => console.warn('[Redis] Connection closed'));

  await _client.connect();
  console.log('[Redis] Connected successfully');
}

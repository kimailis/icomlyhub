const { createClient } = require('redis');

async function clearCache() {
  const client = createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`
  });

  client.on('error', (err) => console.log('Redis Client Error', err));

  await client.connect();
  console.log('Connected to Redis');

  const result = await client.del('feed:global');
  console.log('Deleted feed:global:', result);

  await client.quit();
}

clearCache().catch(console.error);

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
  const resultPro = await client.del('feed:global:pro');
  console.log('Deleted feed:global:pro:', resultPro);
  const resultFree = await client.del('feed:global:free');
  console.log('Deleted feed:global:free:', resultFree);
  
  const resultCelebPro = await client.del('celebs:top:pro');
  console.log('Deleted celebs:top:pro:', resultCelebPro);
  const resultCelebFree = await client.del('celebs:top:free');
  console.log('Deleted celebs:top:free:', resultCelebFree);
  const resultCeleb = await client.del('celebs:top');
  console.log('Deleted celebs:top:', resultCeleb);

  await client.quit();
}

clearCache().catch(console.error);

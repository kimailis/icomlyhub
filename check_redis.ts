import redisClient from './webapp/lib/redis';

async function main() {
    const free = await redisClient.get('feed:global:free');
    const pro = await redisClient.get('feed:global:pro');

    console.log('FREE CACHE:', free ? JSON.parse(free).slice(0, 1).map((x: any) => ({ headline: x.headline, publishedAt: x.publishedAt })) : 'NULL');
    console.log('PRO CACHE:', pro ? JSON.parse(pro).slice(0, 1).map((x: any) => ({ headline: x.headline, publishedAt: x.publishedAt })) : 'NULL');
}

main().catch(console.error).finally(() => process.exit(0));

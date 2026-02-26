const { createClient } = require('redis');

async function check() {
    const client = createClient({
        url: 'redis://localhost:6379'
    });
    
    await client.connect();
    const data = await client.get('feed:global');
    if (!data) {
        console.log('No feed:global found in Redis');
    } else {
        const parsed = JSON.parse(data);
        console.log(`Feed length in Redis: ${parsed.length}`);
        
        const first = parsed[0];
        console.log('First item details:');
        console.log(`  Headline: ${first.headline}`);
        console.log(`  Type: ${first.type}`);
        console.log(`  celebId: ${first.celebId}`);
        console.log(`  celebName: ${first.celebName}`);
        console.log(`  imageUrl: ${first.imageUrl}`);
        console.log(`  source: ${first.source}`);
        console.log(`  timestamp: ${first.timestamp}`);
    }
    
    await client.disconnect();
}

check();

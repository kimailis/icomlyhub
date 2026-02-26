const axios = require('axios');

async function checkFeed() {
    try {
        const response = await axios.get('http://localhost:3000/api/feed');
        const feed = response.data;
        console.log(`Feed length: ${feed.length}`);
        
        feed.forEach((item, i) => {
            const hasImageUrl = !!item.imageUrl;
            const hasCelebId = !!item.celebId;
            const hasCelebName = !!item.celebName;
            
            if (!hasImageUrl || !hasCelebId || !hasCelebName) {
                console.log(`[!] ITEM ${i} MISSING DATA:`);
                console.log(`    Headline: ${item.headline || item.summary?.substring(0, 30)}`);
                console.log(`    Type: ${item.type}`);
                console.log(`    imageUrl: ${item.imageUrl}`);
                console.log(`    celebId: ${item.celebId}`);
                console.log(`    celebName: ${item.celebName}`);
            }
        });
        
        if (feed.length > 0) {
            console.log('Sample item:', JSON.stringify(feed[0], null, 2));
        }
    } catch (error) {
        console.error('Error fetching feed:', error.message);
    }
}

checkFeed();

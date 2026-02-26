
const axios = require('axios');

async function checkFeed() {
    try {
        const response = await axios.get('http://webapp:3000/api/feed');
        const feed = response.data;
        console.log(`Feed length: ${feed.length}`);
        
        const topItems = feed.slice(0, 5);
        topItems.forEach(item => {
            console.log(`- [${item.type}] ${item.headline || item.summary.substring(0, 50)}...`);
            console.log(`  Comments: ${item.commentCount}, Likes: ${item.likeCount}`);
        });
    } catch (error) {
        console.error('Error fetching feed:', error.message);
    }
}

checkFeed();

const PersonalityManager = require('./personalityManager');
const PersonalityContentGenerator = require('./personalityContentGenerator');

// Test script to verify personality-based content generation
async function testPersonalitySystem() {
    console.log('=== Testing Personality-Based Content Generation ===\n');
    
    try {
        // Initialize managers
        const personalityManager = new PersonalityManager();
        const contentGenerator = new PersonalityContentGenerator();
        
        // Test with a few different users
        const testUsers = ['PixelForge88', 'CoffeeAddict99', 'ScarletMuse'];
        
        for (const username of testUsers) {
            console.log(`\n--- Testing ${username} ---`);
            
            // Get personality info
            const personality = personalityManager.getPersonality(username);
            console.log(`Personality traits:`, {
                humor: personality.personality.humor,
                technical: personality.personality.technical,
                creative: personality.personality.creative,
                social: personality.personality.social
            });
            
            console.log(`Content preferences:`, personality.contentPreferences.topics);
            console.log(`Interaction style: ${personality.socialBehavior.interactionStyle}`);
            console.log(`Emoji usage: ${personality.contentPreferences.emojiUsage}`);
            
            // Generate content
            console.log('\nGenerated content:');
            for (let i = 0; i < 3; i++) {
                const content = contentGenerator.generatePersonalityContent(username);
                console.log(`${i + 1}. ${content.content}`);
            }
            
            // Generate comments
            console.log('\nGenerated comments for tech post:');
            const techPost = "Just spent 3 hours debugging and finally found the issue! #tech #coding #debugging";
            for (let i = 0; i < 3; i++) {
                const comment = contentGenerator.generatePersonalityComment(username, techPost, 'SomeUser');
                console.log(`${i + 1}. ${comment}`);
            }
            
            console.log('\n' + '='.repeat(50));
        }
        
        // Test topic selection
        console.log('\n--- Testing Topic Selection ---');
        for (const username of testUsers) {
            const topics = [];
            for (let i = 0; i < 10; i++) {
                topics.push(personalityManager.selectTopicForUser(username));
            }
            console.log(`${username} topic distribution:`, 
                topics.reduce((acc, topic) => {
                    acc[topic] = (acc[topic] || 0) + 1;
                    return acc;
                }, {})
            );
        }
        
        // Test comment probability
        console.log('\n--- Testing Comment Probability ---');
        const testPosts = [
            "Beautiful sunset tonight! #nature #photography",
            "Debug session successful! Fixed the memory leak #tech #programming",
            "Just made the perfect latte art ☕ #coffee #art",
            "Anyone else struggling with work-life balance? #personal #advice"
        ];
        
        for (const username of testUsers) {
            console.log(`\n${username} comment probability:`)
            for (const post of testPosts) {
                const shouldComment = personalityManager.shouldUserComment(username, post);
                console.log(`  "${post.substring(0, 30)}..." -> ${shouldComment ? 'WOULD COMMENT' : 'would skip'}`);
            }
        }
        
        console.log('\n=== Test Complete ===');
        
    } catch (error) {
        console.error('Error testing personality system:', error);
    }
}

// Run the test
if (require.main === module) {
    testPersonalitySystem();
}

module.exports = { testPersonalitySystem }; 
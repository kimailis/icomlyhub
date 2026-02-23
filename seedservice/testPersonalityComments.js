const PersonalityManager = require('./personalityManager');
const PersonalityContentGenerator = require('./personalityContentGenerator');

// Test script to verify enhanced contextual comment generation
async function testContextualComments() {
    console.log('=== Testing Enhanced Contextual Comment Generation ===\n');
    
    try {
        // Initialize managers
        const personalityManager = new PersonalityManager();
        const contentGenerator = new PersonalityContentGenerator();
        
        // Test users with different personalities
        const testUsers = [
            { username: 'PixelForge88', traits: 'High Technical, Creative' },
            { username: 'CoffeeAddict99', traits: 'High Social, Humor' },
            { username: 'ScarletMuse', traits: 'Neutral (Default)' }
        ];
        
        // Test posts with different contexts
        const testPosts = [
            {
                content: "Just spent 3 hours debugging and finally found the issue! It was a missing semicolon 🤦‍♂️ #coding #debugging #programming",
                context: "Technical debugging post"
            },
            {
                content: "Finally finished my digital art project! Took weeks but I'm so proud of how it turned out 🎨✨ #art #creative #digitalart",
                context: "Creative achievement post"
            },
            {
                content: "Made the perfect latte art this morning ☕ Starting the day right! #coffee #morning #routine",
                context: "Lifestyle/coffee post"
            },
            {
                content: "Struggling with work-life balance lately. Any advice on how to manage everything? #advice #worklife #help",
                context: "Support-seeking post"
            },
            {
                content: "Beautiful sunset tonight! Nature never fails to amaze me 🌅 #nature #sunset #grateful",
                context: "Nature appreciation post"
            },
            {
                content: "Learning React hooks and my mind is blown! The possibilities are endless! #react #learning #webdev",
                context: "Learning excitement post"
            },
            {
                content: "Finished my 5K run today! Been training for months and finally hit my goal 🏃‍♀️💪 #fitness #goals #running",
                context: "Fitness achievement post"
            }
        ];
        
        console.log('Testing how different personalities respond to various post contexts...\n');
        
        // Test each user against each post
        for (const user of testUsers) {
            console.log(`\n🎭 ${user.username} (${user.traits})`);
            console.log('='.repeat(60));
            
            const personality = personalityManager.getPersonality(user.username);
            console.log(`Interaction Style: ${personality.socialBehavior.interactionStyle}`);
            console.log(`Technical: ${personality.personality.technical}/10, Social: ${personality.personality.social}/10, Creative: ${personality.personality.creative}/10`);
            console.log(`Emoji Usage: ${personality.contentPreferences.emojiUsage}\n`);
            
            for (const post of testPosts) {
                console.log(`📝 ${post.context}:`);
                console.log(`   "${post.content}"`);
                
                // Generate multiple comments to show variety
                const comments = [];
                for (let i = 0; i < 3; i++) {
                    const comment = contentGenerator.generatePersonalityComment(
                        user.username, 
                        post.content, 
                        'TestUser'
                    );
                    comments.push(comment);
                }
                
                console.log(`💬 Possible responses:`);
                comments.forEach((comment, index) => {
                    console.log(`   ${index + 1}. "${comment}"`);
                });
                console.log('');
            }
        }
        
        // Demonstrate contextual detection
        console.log('\n🔍 Context Detection Analysis');
        console.log('='.repeat(60));
        
        const analysisPost = "Just spent 3 hours debugging a memory leak in my React app. Finally tracked it down to a useEffect cleanup issue! #tech #debugging #react";
        
        for (const user of testUsers) {
            const personality = personalityManager.getPersonality(user.username);
            const detectedContext = contentGenerator.determineCommentContext(analysisPost, personality);
            console.log(`${user.username}: Detected context = "${detectedContext}"`);
        }
        
        console.log('\n✅ Enhanced Comment System Features:');
        console.log('   • Context-aware responses based on post content');
        console.log('   • Personality-driven interaction styles');
        console.log('   • Relevant technical responses for tech posts');
        console.log('   • Supportive responses for struggle posts');
        console.log('   • Celebratory responses for achievement posts');
        console.log('   • Topic-specific engagement (coffee, art, fitness, etc.)');
        console.log('   • Personality touches (technical, creative, social additions)');
        console.log('   • Emoji usage based on user preferences');
        
        console.log('\n=== Test Complete ===');
        
    } catch (error) {
        console.error('Error testing contextual comments:', error);
    }
}

// Run the test
if (require.main === module) {
    testContextualComments();
}

module.exports = { testContextualComments }; 
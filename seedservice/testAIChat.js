require('dotenv').config();
const AIChatManager = require('./aiChatManager');

// Simple test to verify the AI chat manager initializes correctly
async function testAIChatManager() {
    console.log('Testing AI Chat Manager initialization...');
    
    try {
        const aiChatManager = new AIChatManager();
        console.log('✓ AI Chat Manager initialized successfully');
        
        // Check OpenAI initialization
        if (aiChatManager.openai) {
            console.log('✓ OpenAI GPT-4.1 nano client initialized');
        } else {
            console.log('⚠ OpenAI client not initialized - check API key');
        }
        
        // Test database connection
        const seedUsers = await aiChatManager.getSeedUsers();
        console.log(`✓ Found ${seedUsers.length} seed users`);
        
        // Test personality loading
        if (seedUsers.length > 0) {
            const testUser = seedUsers[0];
            const personality = aiChatManager.loadPersonalityData(testUser.username);
            if (personality) {
                console.log(`✓ Successfully loaded personality for ${testUser.username}`);
                console.log(`  - Traits: ${personality.personality_traits.join(', ')}`);
                console.log(`  - Interests: ${personality.interests.join(', ')}`);
            } else {
                console.log(`⚠ No personality data found for ${testUser.username}`);
            }
        }
        
        // Test unread column existence
        if (seedUsers.length > 0) {
            const testChatId = 'chat_1000_1001'; // Example chat ID
            const testUserId = 1001; // Example user ID
            
            try {
                const unreadStatus = await aiChatManager.checkUnreadStatus(testChatId, testUserId);
                console.log(`✓ Unread system check: Column exists: ${unreadStatus.hasUnreadColumn}, Count: ${unreadStatus.unreadCount}`);
            } catch (error) {
                console.log(`⚠ Could not check unread status: ${error.message}`);
            }

            // Test response cleanup
            const testUser = seedUsers[0];
            const personality = aiChatManager.loadPersonalityData(testUser.username);
            if (personality) {
                const testResponse = "I think that's really interesting — could you tell me more about it?";
                const cleanedResponse = aiChatManager.cleanupResponse(testResponse, true, personality.personality_traits);
                console.log(`✓ Response cleanup test:`);
                console.log(`  Original: "${testResponse}"`);
                console.log(`  Cleaned: "${cleanedResponse}"`);
            }
        }
        
        // Stop the manager
        aiChatManager.stop();
        console.log('✓ Test completed successfully');
        
    } catch (error) {
        console.error('✗ Test failed:', error);
    }
    
    process.exit(0);
}

testAIChatManager();
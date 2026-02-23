require('dotenv').config();
const AIChatManager = require('./aiChatManager');
const axios = require('axios');

// Debug script to test AI chat manager real-time functionality in Docker
async function debugAIChatRealTime() {
    console.log('=== AI Chat Real-Time Debug (Docker) ===');
    
    // Test Docker networking first
    console.log('\n=== Testing Docker Network Connectivity ===');
    const mainServerUrl = process.env.MAIN_SERVER_URL || 'http://icomlysrv:3000';
    console.log(`Main server URL: ${mainServerUrl}`);
    
    try {
        const response = await axios.get(`${mainServerUrl}/api/debug/sse-connections`, { timeout: 5000 });
        console.log('✓ Main server is reachable from seedservice');
        console.log(`   Active SSE connections: ${response.data.totalUsers} users`);
    } catch (error) {
        console.log(`✗ Main server not reachable: ${error.message}`);
        console.log('   Check if icomlysrv service is running and network is configured correctly');
    }
    
    try {
        const aiChatManager = new AIChatManager();
        console.log('✓ AI Chat Manager initialized');
        
        // Test database connection
        const seedUsers = await aiChatManager.getSeedUsers();
        console.log(`✓ Found ${seedUsers.length} seed users`);
        
        if (seedUsers.length > 0) {
            const testUser = seedUsers[0];
            console.log(`Testing with user: ${testUser.username} (ID: ${testUser.user_id})`);
            
            // Test personality loading
            const personality = aiChatManager.loadPersonalityData(testUser.username);
            if (personality) {
                console.log(`✓ Personality loaded for ${testUser.username}`);
            } else {
                console.log(`⚠ No personality data for ${testUser.username}`);
            }
            
            // Test notification system
            console.log('\n=== Testing Notification System ===');
            try {
                await aiChatManager.notifyMainServer(100000, {
                    type: 'new_message',
                    chatId: `chat_${testUser.user_id}_100000`,
                    messageId: 99999,
                    senderId: testUser.user_id,
                    message: 'Test notification message from Docker',
                    timestamp: new Date().toISOString()
                });
                console.log('✓ Notification system test passed');
            } catch (notifyError) {
                console.log('✗ Notification system test failed:', notifyError.message);
            }
            
            // Test OpenAI initialization
            console.log('\n=== Testing OpenAI Integration ===');
            if (aiChatManager.openai) {
                console.log('✓ OpenAI client initialized');
            } else {
                console.log('✗ OpenAI client not initialized - check OPENAI_API_KEY environment variable');
            }
            
            // Check if AI chat manager is actively monitoring
            console.log('\n=== Testing Active Monitoring ===');
            console.log(`Current interval: ${aiChatManager.currentInterval}ms`);
            console.log(`Timeout ID: ${aiChatManager.timeoutId ? 'Active' : 'Inactive'}`);
        }
        
        // Stop the manager
        aiChatManager.stop();
        console.log('\n✓ Debug completed successfully');
        
    } catch (error) {
        console.error('✗ Debug failed:', error);
    }
    
    process.exit(0);
}

debugAIChatRealTime();
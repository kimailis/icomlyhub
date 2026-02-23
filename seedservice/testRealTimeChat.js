require('dotenv').config();
const axios = require('axios');

// Test the real-time chat notification system
async function testRealTimeNotification() {
    console.log('Testing real-time chat notification...');
    
    const mainServerUrl = process.env.MAIN_SERVER_URL || 'http://icomlysrv:3000';
    
    // Test payload simulating an AI message
    const testPayload = {
        userId: 100000, // Example real user ID
        username: 'testuser',
        messageData: {
            type: 'new_message',
            chatId: 'chat_1000_100000',
            messageId: 12345,
            senderId: 1000,
            senderUsername: 'alice_wonder',
            message: 'Hello! This is a test AI message.',
            timestamp: new Date().toISOString()
        }
    };
    
    try {
        console.log('Sending test notification to:', `${mainServerUrl}/api/internal/notify-message`);
        console.log('Payload:', JSON.stringify(testPayload, null, 2));
        
        const response = await axios.post(`${mainServerUrl}/api/internal/notify-message`, testPayload, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Service': 'seedservice'
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
        
        if (response.data.type === 'success') {
            console.log('✓ Real-time notification test successful!');
            console.log(`✓ Message broadcasted to ${response.data.connectionCount || 0} connections`);
        } else {
            console.log('⚠ Notification failed:', response.data.message);
        }
        
    } catch (error) {
        console.error('✗ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testRealTimeNotification();
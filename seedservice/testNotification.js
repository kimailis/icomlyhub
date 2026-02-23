require('dotenv').config();
const axios = require('axios');

// Test the internal notification endpoint
async function testNotification() {
    console.log('Testing internal notification endpoint...');
    
    const mainServerUrl = process.env.MAIN_SERVER_URL || 'http://localhost:3000';
    
    const testPayload = {
        userId: 1001, // Example user ID
        username: 'testuser',
        messageData: {
            type: 'new_message',
            chatId: 'chat_1000_1001',
            messageId: 12345,
            senderId: 1000,
            senderUsername: 'ArtisticSoul99',
            message: 'This is a test message from AI',
            timestamp: new Date().toISOString()
        }
    };

    try {
        const response = await axios.post(`${mainServerUrl}/api/internal/notify-message`, testPayload, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Service': 'seedservice'
            }
        });

        if (response.data.type === 'success') {
            console.log('✓ Notification endpoint test successful');
            console.log('Response:', response.data);
        } else {
            console.log('⚠ Notification endpoint returned error:', response.data);
        }
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('⚠ Main server is not running or not accessible');
        } else if (error.response) {
            console.log('⚠ Server responded with error:', error.response.status, error.response.data);
        } else {
            console.log('⚠ Network error:', error.message);
        }
    }
}

testNotification();
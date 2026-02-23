require('dotenv').config();
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Database configuration
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Base directory for seed users
const SEEDUSERS_DIR = path.join(__dirname, 'seedusers');

// Create directories if they don't exist
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }
}

// Create personality file template
function createPersonalityFile(username, userId, filepath) {
    const personalityTemplate = `// Personality configuration for ${username} (ID: ${userId})
// This file defines the characteristics, preferences, and content style for this seed user

module.exports = {
    // Basic info
    username: '${username}',
    userId: ${userId},
    
    // Personality traits (0-10 scale)
    personality: {
        humor: 7,           // How funny/witty the user is
        controversial: 5,   // How likely to post controversial content
        technical: 6,       // How technical/nerdy the posts are
        social: 8,          // How social/interactive the user is
        creative: 7,        // How creative/artistic the content is
        emotional: 5,       // How emotional/personal the posts are
        trendy: 6,          // How much they follow trends
        intellectual: 6     // How intellectual/deep the content is
    },
    
    // Content preferences
    contentPreferences: {
        // Preferred topics (higher weight = more likely to post about)
        topics: {
            tech: 0.3,
            gaming: 0.2,
            lifestyle: 0.2,
            humor: 0.3,
            personal: 0.1,
            news: 0.1
        },
        
        // Posting frequency (posts per day)
        postFrequency: 1.5,
        
        // Comment frequency (comments per day)
        commentFrequency: 3.0,
        
        // Preferred post length
        postLength: 'medium', // short, medium, long
        
        // Emoji usage
        emojiUsage: 'moderate' // none, light, moderate, heavy
    },
    
    // Bio information
    bio: {
        text: '', // Will be generated based on personality
        interests: ['technology', 'gaming', 'social media'],
        location: '', // Optional
        website: '' // Optional
    },
    
    // Social behavior
    socialBehavior: {
        // How likely to follow other users (0-1)
        followProbability: 0.3,
        
        // How likely to like posts (0-1)
        likeProbability: 0.7,
        
        // How likely to comment on posts (0-1)
        commentProbability: 0.4,
        
        // Preferred interaction style
        interactionStyle: 'friendly' // friendly, sarcastic, helpful, neutral
    },
    
    // Content generation settings
    contentGeneration: {
        // Use AI generation vs template-based
        useAI: false,
        
        // Custom templates for this user
        customTemplates: [],
        
        // Hashtag preferences
        hashtagStyle: 'moderate', // none, minimal, moderate, heavy
        
        // Link sharing frequency
        linkSharing: 0.2 // 0-1 probability of including links
    }
};
`;

    fs.writeFileSync(filepath, personalityTemplate);
    console.log(`Created personality file: ${filepath}`);
}

// Main function to set up seed user structure
async function setupSeedUsersStructure() {
    try {
        console.log('Setting up seed users folder structure...');
        
        // Create main seedusers directory
        ensureDirectoryExists(SEEDUSERS_DIR);
        
        // Get all seed users from database
        const [users] = await db.promise().query(
            'SELECT user_id, username FROM users WHERE user_id BETWEEN 1000 AND 9999 ORDER BY user_id'
        );
        
        console.log(`Found ${users.length} seed users to set up`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const user of users) {
            try {
                console.log(`\nSetting up structure for: ${user.username} (ID: ${user.user_id})`);
                
                // Create user directory
                const userDir = path.join(SEEDUSERS_DIR, user.username);
                ensureDirectoryExists(userDir);
                
                // Create profilepic directory
                const profilePicDir = path.join(userDir, 'profilepic');
                ensureDirectoryExists(profilePicDir);
                
                // Create postpics directory
                const postPicsDir = path.join(userDir, 'postpics');
                ensureDirectoryExists(postPicsDir);
                
                // Create personality file
                const personalityFile = path.join(userDir, `${user.username}_personality.js`);
                if (!fs.existsSync(personalityFile)) {
                    createPersonalityFile(user.username, user.user_id, personalityFile);
                } else {
                    console.log(`Personality file already exists: ${personalityFile}`);
                }
                
                console.log(`✅ Successfully set up structure for ${user.username}`);
                successCount++;
                
            } catch (error) {
                console.error(`❌ Error setting up ${user.username}: ${error.message}`);
                errorCount++;
            }
        }
        
        console.log(`\n🎉 Setup completed!`);
        console.log(`✅ Success: ${successCount} users`);
        console.log(`❌ Errors: ${errorCount} users`);
        console.log(`\nFolder structure created at: ${SEEDUSERS_DIR}`);
        
    } catch (error) {
        console.error('Fatal error during setup:', error);
    } finally {
        db.end();
    }
}

// Run the script
if (require.main === module) {
    setupSeedUsersStructure().catch(console.error);
}

module.exports = { setupSeedUsersStructure }; 
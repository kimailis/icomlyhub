const readline = require('readline');
const { 
    config, 
    updateCategoryWeights, 
    updateMoodSettings, 
    updateApiFrequency, 
    updatePostTiming 
} = require('./config');

// Import enhanced components for testing
let OpenAIContentGenerator, EnhancedCommentManager;
try {
    OpenAIContentGenerator = require('./openaiContentGenerator');
    EnhancedCommentManager = require('./enhancedCommentManager');
} catch (error) {
    console.log('Enhanced components not available:', error.message);
}

let rl;

function initializeReadline() {
    try {
        // Check if CLI mode is forced
        const forceCLI = process.env.FORCE_CLI === 'true';
        
        // Check if we're running in a Docker container
        const isDocker = process.env.DOCKER_CONTAINER === 'true';
        
        if (isDocker && !forceCLI) {
            console.log('Running in Docker container - CLI interface disabled');
            console.log('To enable CLI, use: docker exec -it <container_id> /bin/sh -c "FORCE_CLI=true node -e \\"require(\'./cli.js\').startCLI()\\""');
            console.log('Or use the seedctl.sh script');
            return false;
        }

        // Test if stdin is actually available
        if (!process.stdin.isTTY && !forceCLI) {
            console.log('Interactive terminal not available - CLI interface disabled');
            return false;
        }

        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Handle cleanup
        rl.on('close', () => {
            console.log('CLI interface closed');
            // Only exit if CLI was forced (meaning we're in CLI-only mode)
            if (forceCLI) {
                process.exit(0);
            }
        });

        return true;
    } catch (error) {
        console.log('Failed to initialize CLI interface:', error.message);
        return false;
    }
}

function displayMenu() {
    console.log('\n=== Seed Service Configuration ===');
    console.log('1. View current settings');
    console.log('2. Update category weights');
    console.log('3. Update mood settings');
    console.log('4. Update API frequency');
    console.log('5. Update post timing');
    console.log('6. Test OpenAI content generation');
    console.log('7. Test enhanced comment generation');
    console.log('8. View OpenAI health status');
    console.log('9. Update special task for AI content');
    console.log('10. View current special task');
    console.log('11. Exit');
    console.log('\nEnter your choice (1-11):');
}

function displayCurrentSettings() {
    console.log('\nCurrent Settings:');
    console.log('Category Weights:', config.categoryWeights);
    console.log('Mood Settings:', config.moodSettings);
    console.log('API Frequency:', config.apiContentFrequency);
    console.log('Post Timing:', {
        min: config.postIntervalMin / 1000 + 's',
        max: config.postIntervalMax / 1000 + 's'
    });
}

async function question(prompt) {
    if (!rl) return null;
    
    try {
        return new Promise(resolve => {
            rl.question(prompt, resolve);
        });
    } catch (error) {
        console.error('Error reading input:', error.message);
        return null;
    }
}

async function updateCategories() {
    if (!rl) return;
    
    console.log('\nCurrent category weights:', config.categoryWeights);
    console.log('\nEnter new weights (must sum to 1):');
    
    try {
        const weights = {};
        for (const category of Object.keys(config.categoryWeights)) {
            const answer = await question(`${category} (current: ${config.categoryWeights[category]}): `);
            if (answer === null) return;
            weights[category] = parseFloat(answer) || config.categoryWeights[category];
        }
        
        updateCategoryWeights(weights);
        console.log('Category weights updated successfully!');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function updateMoods() {
    if (!rl) return;
    
    console.log('\nSelect category to update mood:');
    Object.keys(config.moodSettings).forEach((category, index) => {
        console.log(`${index + 1}. ${category}`);
    });
    
    const answer = await question('Enter category number: ');
    if (answer === null) return;
    
    const categoryIndex = parseInt(answer) - 1;
    const category = Object.keys(config.moodSettings)[categoryIndex];
    if (!category) {
        console.log('Invalid category selection');
        return;
    }
    
    console.log(`\nUpdating mood for ${category}:`);
    const currentMood = config.moodSettings[category];
    const newMood = {};
    
    for (const [setting, value] of Object.entries(currentMood)) {
        const moodAnswer = await question(`${setting} (current: ${value}, 0-1): `);
        if (moodAnswer === null) return;
        newMood[setting] = parseFloat(moodAnswer) || value;
    }
    
    updateMoodSettings(category, newMood);
    console.log('Mood settings updated successfully!');
}

async function updateApiSettings() {
    if (!rl) return;
    
    console.log('\nCurrent API frequency:', config.apiContentFrequency);
    
    const answer = await question('Enter new API frequency (0-1): ');
    if (answer === null) return;
    
    const frequency = parseFloat(answer) || config.apiContentFrequency;
    
    try {
        updateApiFrequency(frequency);
        console.log('API frequency updated successfully!');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function updateTiming() {
    if (!rl) return;
    
    console.log('\nCurrent post timing:');
    console.log('Minimum interval:', config.postIntervalMin / 1000, 'seconds');
    console.log('Maximum interval:', config.postIntervalMax / 1000, 'seconds');
    
    const minAnswer = await question('Enter new minimum interval (seconds): ');
    if (minAnswer === null) return;
    
    const maxAnswer = await question('Enter new maximum interval (seconds): ');
    if (maxAnswer === null) return;
    
    const minSeconds = parseInt(minAnswer) || config.postIntervalMin / 1000;
    const maxSeconds = parseInt(maxAnswer) || config.postIntervalMax / 1000;
    
    try {
        updatePostTiming(minSeconds * 1000, maxSeconds * 1000);
        console.log('Post timing updated successfully!');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function testOpenAIGeneration() {
    if (!rl || !OpenAIContentGenerator) {
        console.log('OpenAI content generator not available');
        return;
    }
    
    console.log('\n=== Testing OpenAI Content Generation ===');
    
    const usernameAnswer = await question('Enter username (or press Enter for "test_user"): ');
    if (usernameAnswer === null) return;
    
    const username = usernameAnswer.trim() || 'test_user';
    
    const personalityAnswer = await question('Use personality-based generation? (y/n): ');
    if (personalityAnswer === null) return;
    
    const usePersonality = personalityAnswer.toLowerCase().startsWith('y');
    
    try {
        console.log('\nGenerating content...');
        const generator = global.openaiContentGenerator || new OpenAIContentGenerator();
        const result = await generator.generateContent(username, usePersonality);
        
        if (result) {
            console.log('\n--- Generated Content ---');
            console.log('Content:', result.content);
            console.log('Hashtags:', result.hashtags || 'None');
            console.log('AI Generated:', result.isOpenAIGenerated ? 'Yes' : 'No');
            console.log('Personality-based:', result.isPersonalityGenerated ? 'Yes' : 'No');
            console.log('Topic:', result.topic || 'Unknown');
        } else {
            console.log('Failed to generate content');
        }
    } catch (error) {
        console.error('Error testing OpenAI generation:', error.message);
    }
}

async function testEnhancedComment() {
    if (!rl || !OpenAIContentGenerator) {
        console.log('Enhanced comment generator not available');
        return;
    }
    
    console.log('\n=== Testing Enhanced Comment Generation ===');
    
    const usernameAnswer = await question('Enter commenter username: ');
    if (usernameAnswer === null) return;
    
    const postContentAnswer = await question('Enter post content: ');
    if (postContentAnswer === null) return;
    
    const postAuthorAnswer = await question('Enter post author username: ');
    if (postAuthorAnswer === null) return;
    
    try {
        console.log('\nGenerating comment...');
        const generator = global.openaiContentGenerator || new OpenAIContentGenerator();
        const result = await generator.generateComment(
            postContentAnswer.trim(),
            usernameAnswer.trim(), 
            postAuthorAnswer.trim()
        );
        
        if (result) {
            console.log('\n--- Generated Comment ---');
            console.log('Comment:', result.content);
            console.log('AI Generated:', result.isOpenAIGenerated ? 'Yes' : 'No');
        } else {
            console.log('Failed to generate comment');
        }
    } catch (error) {
        console.error('Error testing enhanced comment:', error.message);
    }
}

async function viewOpenAIHealth() {
    if (!rl || !OpenAIContentGenerator) {
        console.log('OpenAI content generator not available');
        return;
    }
    
    console.log('\n=== OpenAI Health Status ===');
    
    try {
        console.log('Checking health...');
        const generator = global.openaiContentGenerator || new OpenAIContentGenerator();
        const health = await generator.healthCheck();
        
        console.log('\n--- Health Status ---');
        console.log('Status:', health ? 'Healthy' : 'Unhealthy');
        console.log('OpenAI Available:', health ? 'Yes' : 'No');
        if (health.error) {
            console.log('Error:', health.error);
        }
    } catch (error) {
        console.error('Error checking OpenAI health:', error.message);
    }
}

async function updateSpecialTask() {
    if (!rl || !OpenAIContentGenerator) {
        console.log('OpenAI content generator not available');
        return;
    }
    
    // Use global instance if available, otherwise create new one
    const generator = global.openaiContentGenerator || new OpenAIContentGenerator();
    
    console.log('\n=== Update Special Task for AI Content ===');
    
    try {
        const currentTask = generator.getSpecialTask();
        
        console.log(`Current special task: "${currentTask}"`);
        console.log('\nThe special task guides AI content generation towards specific subjects or themes.');
        console.log('Examples:');
        console.log('- "focus on technology and programming discussions"');
        console.log('- "emphasize daily life and personal experiences"');
        console.log('- "highlight creative projects and artistic endeavors"');
        console.log('- "discuss fitness, health, and wellness topics"');
        console.log('- "share opinions on current events and trends"');
        
        const newTaskAnswer = await question('\nEnter new special task (or press Enter to keep current): ');
        if (newTaskAnswer === null) return;
        
        const newTask = newTaskAnswer.trim();
        if (newTask && newTask !== currentTask) {
            generator.setSpecialTask(newTask);
            console.log(`\nSpecial task updated successfully!`);
            console.log(`New task: "${newTask}"`);
            console.log('\nThis will affect all future AI-generated content for seed users.');
        } else if (!newTask) {
            console.log('\nSpecial task kept unchanged.');
        } else {
            console.log('\nSpecial task is already set to this value.');
        }
    } catch (error) {
        console.error('Error updating special task:', error.message);
    }
}

async function viewSpecialTask() {
    if (!rl || !OpenAIContentGenerator) {
        console.log('OpenAI content generator not available');
        return;
    }
    
    // Use global instance if available, otherwise create new one
    const generator = global.openaiContentGenerator || new OpenAIContentGenerator();
    
    console.log('\n=== Current Special Task ===');
    
    try {
        const currentTask = generator.getSpecialTask();
        
        console.log(`Special Task: "${currentTask}"`);
        console.log('\nThis task guides AI content generation for all seed users.');
        console.log('It helps focus the AI towards specific subjects, themes, or content types.');
    } catch (error) {
        console.error('Error viewing special task:', error.message);
    }
}

async function handleChoice(choice) {
    if (!rl) return false;
    
    switch (choice) {
        case '1':
            displayCurrentSettings();
            break;
        case '2':
            await updateCategories();
            break;
        case '3':
            await updateMoods();
            break;
        case '4':
            await updateApiSettings();
            break;
        case '5':
            await updateTiming();
            break;
        case '6':
            await testOpenAIGeneration();
            break;
        case '7':
            await testEnhancedComment();
            break;
        case '8':
            await viewOpenAIHealth();
            break;
        case '9':
            await updateSpecialTask();
            break;
        case '10':
            await viewSpecialTask();
            break;
        case '11':
            console.log('Exiting configuration...');
            rl.close();
            return false;
        default:
            console.log('Invalid choice. Please try again.');
    }
    return true;
}

async function startCLI() {
    // Initialize readline interface
    const cliAvailable = initializeReadline();
    
    // If CLI is not available and not forced, just display current settings and exit
    if (!cliAvailable) {
        console.log('\nCurrent configuration:');
        displayCurrentSettings();
        return;
    }
    
    let running = true;
    console.log('Welcome to Seed Service Configuration\n');
    
    try {
        while (running) {
            displayMenu();
            const choice = await question('');
            if (choice === null) break;
            running = await handleChoice(choice);
        }
    } catch (error) {
        console.error('CLI error:', error.message);
    } finally {
        if (rl) {
            rl.close();
        }
    }
}

// Export a function to start CLI in forced mode
function startForcedCLI() {
    process.env.FORCE_CLI = 'true';
    return startCLI();
}

module.exports = { startCLI, startForcedCLI }; 
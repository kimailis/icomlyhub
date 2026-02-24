const fs = require('fs');
const path = require('path');

class PersonalityManager {
    constructor() {
        this.personalities = new Map();
        this.loadAllPersonalities();
    }

    // Load all personality files from the seedusers directory
    loadAllPersonalities() {
        const seedUsersDir = path.join(__dirname, 'seedusers');
        
        if (!fs.existsSync(seedUsersDir)) {
            console.error('Seedusers directory not found');
            return;
        }

        const userDirectories = fs.readdirSync(seedUsersDir).filter(item => {
            const fullPath = path.join(seedUsersDir, item);
            return fs.statSync(fullPath).isDirectory();
        });

        for (const userDir of userDirectories) {
            try {
                const personalityPath = path.join(seedUsersDir, userDir, `${userDir}_personality.js`);
                
                if (fs.existsSync(personalityPath)) {
                    // Clear require cache to ensure fresh load
                    delete require.cache[require.resolve(personalityPath)];
                    const personality = require(personalityPath);
                    
                    this.personalities.set(personality.username, personality);
                    console.log(`Loaded personality for ${personality.username}`);
                } else {
                    console.warn(`Personality file not found for ${userDir}`);
                }
            } catch (error) {
                console.error(`Error loading personality for ${userDir}:`, error);
            }
        }

        console.log(`Loaded ${this.personalities.size} personality profiles`);
    }

    // Get personality data for a specific user
    getPersonality(username) {
        return this.personalities.get(username) || this.getDefaultPersonality(username);
    }

    // Create a default personality if none exists
    getDefaultPersonality(username) {
        return {
            username,
            personality: {
                humor: 5,
                controversial: 3,
                technical: 5,
                social: 5,
                creative: 5,
                emotional: 5,
                trendy: 5,
                intellectual: 5
            },
            contentPreferences: {
                topics: {
                    tech: 0.2,
                    gaming: 0.2,
                    lifestyle: 0.3,
                    humor: 0.2,
                    personal: 0.1
                },
                postFrequency: 1.5,
                commentFrequency: 3.0,
                postLength: 'medium',
                emojiUsage: 'moderate'
            },
            bio: {
                text: 'Just another user on iComly!',
                interests: ['social media', 'connecting with people']
            },
            socialBehavior: {
                followProbability: 0.5,
                likeProbability: 0.6,
                commentProbability: 0.4,
                interactionStyle: 'neutral'
            },
            contentGeneration: {
                hashtagStyle: 'none',
                linkSharing: 0.2
            }
        };
    }

    // Get all loaded personalities
    getAllPersonalities() {
        return Array.from(this.personalities.values());
    }

    // Get users by personality trait
    getUsersByTrait(trait, minValue = 7) {
        return Array.from(this.personalities.values()).filter(p => {
            // Handle old format with numeric traits
            if (p.personality && p.personality[trait] >= minValue) {
                return true;
            }
            
            // Handle new format with string array traits
            if (p.personality_traits && Array.isArray(p.personality_traits)) {
                const traits = p.personality_traits.map(t => t.toLowerCase());
                const traitKeywords = {
                    'technical': ['technical', 'programmer', 'coding', 'tech', 'developer'],
                    'creative': ['creative', 'artistic', 'art', 'design', 'visual'],
                    'humor': ['humorous', 'funny', 'humor', 'comedic', 'witty'],
                    'social': ['social', 'friendly', 'outgoing', 'chatty', 'talkative'],
                    'intellectual': ['intellectual', 'thoughtful', 'philosophical', 'analytical', 'smart']
                };
                
                const keywords = traitKeywords[trait] || [trait];
                return traits.some(t => keywords.includes(t));
            }
            
            return false;
        });
    }

    // Get users by content preference
    getUsersByContentPreference(topic, minWeight = 0.3) {
        return Array.from(this.personalities.values()).filter(p => {
            // Handle old format with contentPreferences.topics
            if (p.contentPreferences && p.contentPreferences.topics && p.contentPreferences.topics[topic]) {
                return p.contentPreferences.topics[topic] >= minWeight;
            }
            
            // Handle new format by checking interests
            if (p.interests && p.interests.length > 0) {
                const interestToCategory = {
                    'tech': ['technology', 'programming', 'coding', 'software', 'AI', 'blockchain', 'crypto'],
                    'gaming': ['gaming', 'games', 'esports', 'streaming', 'console', 'PC gaming'],
                    'lifestyle': ['fitness', 'health', 'wellness', 'yoga', 'meditation', 'self-improvement', 'fashion', 'beauty', 'luxury', 'elegance'],
                    'humor': ['comedy', 'humor', 'funny', 'jokes', 'memes', 'entertainment'],
                    'personal': ['personal', 'life', 'thoughts', 'feelings', 'relationships', 'family'],
                    'photography': ['photography', 'art', 'visual', 'creative', 'aesthetic'],
                    'science': ['science', 'research', 'nature', 'environment', 'astronomy', 'physics']
                };
                
                const keywords = interestToCategory[topic] || [];
                return p.interests.some(interest => 
                    keywords.some(keyword => interest.toLowerCase().includes(keyword.toLowerCase()))
                );
            }
            
            return false;
        });
    }

    // Select a weighted random topic for a user
    selectTopicForUser(username) {
        const personality = this.getPersonality(username);
        
        // Check if this personality uses the old format with contentPreferences.topics
        if (personality.contentPreferences && personality.contentPreferences.topics) {
            const topics = personality.contentPreferences.topics;
            
            const totalWeight = Object.values(topics).reduce((sum, weight) => sum + weight, 0);
            let random = Math.random() * totalWeight;
            
            for (const [topic, weight] of Object.entries(topics)) {
                random -= weight;
                if (random <= 0) {
                    return topic;
                }
            }
            
            // Fallback to most preferred topic
            return Object.keys(topics).reduce((a, b) => topics[a] > topics[b] ? a : b);
        }
        
        // For new simplified format, derive topic from interests
        if (personality.interests && personality.interests.length > 0) {
            // Map interests to content categories
            const interestToCategory = {
                'tech': ['technology', 'programming', 'coding', 'software', 'AI', 'blockchain', 'crypto'],
                'gaming': ['gaming', 'games', 'esports', 'streaming', 'console', 'PC gaming'],
                'lifestyle': ['fitness', 'health', 'wellness', 'yoga', 'meditation', 'self-improvement', 'fashion', 'beauty', 'luxury', 'elegance'],
                'humor': ['comedy', 'humor', 'funny', 'jokes', 'memes', 'entertainment'],
                'personal': ['personal', 'life', 'thoughts', 'feelings', 'relationships', 'family'],
                'photography': ['photography', 'art', 'visual', 'creative', 'aesthetic'],
                'science': ['science', 'research', 'nature', 'environment', 'astronomy', 'physics']
            };
            
            // Find matching categories for user's interests
            const matchedCategories = [];
            for (const interest of personality.interests) {
                for (const [category, keywords] of Object.entries(interestToCategory)) {
                    if (keywords.some(keyword => interest.toLowerCase().includes(keyword.toLowerCase()))) {
                        matchedCategories.push(category);
                    }
                }
            }
            
            // Return a random matched category, or fallback to lifestyle
            if (matchedCategories.length > 0) {
                return matchedCategories[Math.floor(Math.random() * matchedCategories.length)];
            }
        }
        
        // Default fallback
        return 'lifestyle';
    }

    // Generate personality-appropriate hashtags
    generatePersonalityHashtags(username, content, baseTags = []) {
        return '';
    }

    // Determine if user should post based on their frequency
    shouldUserPost(username) {
        const personality = this.getPersonality(username);
        const frequency = personality.contentPreferences?.postFrequency || 1.5;
        
        // Convert daily frequency to probability per check (assuming checks every 30 minutes)
        const dailyChecks = 48; // 24 hours * 2 checks per hour
        const probability = frequency / dailyChecks;
        
        return Math.random() < probability;
    }

    // Determine if user should comment on a post
    shouldUserComment(username, postContent) {
        const personality = this.getPersonality(username);
        const baseProbability = personality.socialBehavior?.commentProbability || 0.6; // Increased from 0.4 to 0.6
        
        // Adjust probability based on personality and post content
        let adjustedProbability = baseProbability;
        
        // Handle both old and new personality formats
        if (personality.personality) {
            // Old format with numeric traits
            const traits = personality.personality;
            
            // More social users comment more
            if (traits.social >= 7) {
                adjustedProbability *= 1.3;
            }
            
            // Technical users comment more on tech posts
            if (traits.technical >= 7 && 
                (postContent.includes('#tech') || postContent.includes('#coding'))) {
                adjustedProbability *= 1.5;
            }
            
            // Humor lovers comment more on funny posts
            if (traits.humor >= 7 && 
                (postContent.includes('#funny') || postContent.includes('#humor'))) {
                adjustedProbability *= 1.4;
            }
        } else if (personality.personality_traits && Array.isArray(personality.personality_traits)) {
            // New format with string array traits
            const traits = personality.personality_traits.map(t => t.toLowerCase());
            
            // More social users comment more
            if (traits.some(t => ['social', 'friendly', 'outgoing', 'chatty', 'talkative'].includes(t))) {
                adjustedProbability *= 1.3;
            }
            
            // Technical users comment more on tech posts
            if (traits.some(t => ['technical', 'programmer', 'coding', 'tech', 'developer'].includes(t)) &&
                (postContent.includes('#tech') || postContent.includes('#coding'))) {
                adjustedProbability *= 1.5;
            }
            
            // Humor lovers comment more on funny posts
            if (traits.some(t => ['humorous', 'funny', 'humor', 'comedic', 'witty'].includes(t)) &&
                (postContent.includes('#funny') || postContent.includes('#humor'))) {
                adjustedProbability *= 1.4;
            }
        }
        
        return Math.random() < Math.min(adjustedProbability, 0.9); // Increased cap from 0.8 to 0.9
    }
}

module.exports = PersonalityManager; 
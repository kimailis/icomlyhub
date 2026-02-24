// Personality configuration for PixelForge88 (ID: 1000)
// This file is a default template. Please customize it to define the user's personality.

module.exports = {
    // Basic info
    username: 'PixelForge88',
    userId: 1000,
    
    // Personality traits
    personality_traits: ['creative', 'artistic', 'technical', 'innovative', 'irritable', 'has OCD', 'hates loud noises'],
    
    // Bio information
    interests: [
    "celebrity social media drama",
    "hollywood gossip",
    "celeb property deals",
    "movie set rumors",
    "award show drama"
],
    
    // Social behavior
    socialBehavior: {
        // How likely to follow other users (0-1)
        followProbability: 0.4,
        
        // How likely to like posts (0-1)
        likeProbability: 0.6,
        
        // How likely to comment on posts (0-1)
        commentProbability: 0.5,
        
        // Preferred interaction style
        interactionStyle: 'helpful' // friendly, sarcastic, helpful, neutral
    }
}; 
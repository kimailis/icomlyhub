// Personality configuration for CoffeeAddict99 (ID: 1012)
// This file is a default template. Please customize it to define the user's personality.

module.exports = {
    // Basic info
    username: 'CoffeeAddict99',
    userId: 1012,
    
    // Personality traits
    personality_traits: ['energetic', 'friendly', 'social', 'humorous', 'caffeine-dependent', 'productive', 'prefers rainy days', 'dreams of being a lawyer'],
    
    // Bio information
    interests: [
    "red carpet fashion",
    "celeb relationships",
    "hollywood gossip",
    "hollywood casting news",
    "hollywood breakups"
],
    
    // Social behavior
    socialBehavior: {
        // How likely to follow other users (0-1)
        followProbability: 0.6,
        
        // How likely to like posts (0-1)
        likeProbability: 0.9,
        
        // How likely to comment on posts (0-1)
        commentProbability: 0.8,
        
        // Preferred interaction style
        interactionStyle: 'friendly' // friendly, sarcastic, helpful, neutral
    }
}; 
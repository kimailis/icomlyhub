// Personality configuration for BookWorm_Reader (ID: 1013)
// This file is a default template. Please customize it to define the user's personality.

module.exports = {
    // Basic info
    username: 'BookWorm_Reader',
    userId: 1013,
    
    // Personality traits
    personality_traits: ['intellectual', 'creative', 'emotional', 'helpful', 'literary', 'thoughtful'],
    
    // Bio information
    interests: ['literature', 'poetry', 'writing', 'philosophy', 'cozy reading nooks', 'various tea flavors', 'classical russian writers', 'hating rap music'],
    
    // Social behavior
    socialBehavior: {
        // How likely to follow other users (0-1)
        followProbability: 0.4,
        
        // How likely to like posts (0-1)
        likeProbability: 0.8,
        
        // How likely to comment on posts (0-1)
        commentProbability: 0.7,
        
        // Preferred interaction style
        interactionStyle: 'helpful' // friendly, sarcastic, helpful, neutral
    }
}; 
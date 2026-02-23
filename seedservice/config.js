const categoryList = [
    'food', 'tech', 'lifestyle', 'weather', 'provocative', 'health', 'travel', 'books', 'entertainment', 'art', 'sports', 'mindfulness', 'education', 'finance', 'career', 'diy', 'pets', 'fashion', 'sustainability', 'gaming', 'science', 'photography'
];

// Calculate weights: provocative gets double, rest are equal
const baseWeight = 1 / (categoryList.length + 1); // +1 for provocative's extra weight
const provocativeWeight = baseWeight * 2;

const categoryWeights = {};
for (const cat of categoryList) {
    categoryWeights[cat] = (cat === 'provocative') ? provocativeWeight : baseWeight;
}

const config = {
    // Category weights (must sum to 1)
    categoryWeights,

    // API content settings
    apiContentFrequency: 0.3,   // Frequency of API-sourced content (0-1)

    // Post timing settings
    postIntervalMin: 10800000,    // Minimum time between posts (ms) - 3 hours
    postIntervalMax: 10800000,    // Maximum time between posts (ms) - 3 hours

    // Hashtag settings
    minHashtags: 2,
    maxHashtags: 4,

    // Content type weights per category
    contentTypeWeights: {
        tech: {
            discussion: 0.4,
            sharing: 0.3,
            response: 0.3
        },
        food: {
            recipe: 0.4,
            review: 0.3,
            tip: 0.3
        },
        lifestyle: {
            advice: 0.3,
            experience: 0.4,
            question: 0.3
        },
        weather: {
            observation: 0.6,
            activity: 0.4
        },
        provocative: {
            tech_critique: 0.2,      // Tech industry criticism
            social_commentary: 0.3,   // Social trends and behaviors
            contrarian: 0.3,         // Against popular opinions
            debate: 0.2              // Discussion starters
        }
        // Other categories can be added here as needed
    }
};

// Function to validate and update category weights
function updateCategoryWeights(newWeights) {
    const sum = Object.values(newWeights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.001) {
        throw new Error('Category weights must sum to 1');
    }
    config.categoryWeights = { ...newWeights };
}

// Function to update API content frequency
function updateApiFrequency(frequency) {
    if (frequency < 0 || frequency > 1) {
        throw new Error('API frequency must be between 0 and 1');
    }
    config.apiContentFrequency = frequency;
}

// Function to update post timing
function updatePostTiming(minInterval, maxInterval) {
    if (minInterval >= maxInterval) {
        throw new Error('Minimum interval must be less than maximum interval');
    }
    config.postIntervalMin = minInterval;
    config.postIntervalMax = maxInterval;
}

// Function to get a random category based on weights
function getRandomCategory() {
    const rand = Math.random();
    let cumulative = 0;

    for (const [category, weight] of Object.entries(config.categoryWeights)) {
        cumulative += weight;
        if (rand <= cumulative) {
            return category;
        }
    }

    return Object.keys(config.categoryWeights)[0];
}

module.exports = {
    config,
    updateCategoryWeights,
    updateApiFrequency,
    updatePostTiming,
    getRandomCategory
}; 
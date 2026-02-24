const axios = require('axios');
const { config } = require('./config');
const { 
    contentStructure, 
    generateStructuredContent
} = require('./contentStructure');
const { subjectRotator, apiContentCache } = require('./subjectRotation');
const PersonalityContentGenerator = require('./personalityContentGenerator');

// Initialize personality content generator
let personalityContentGenerator = null;

// Function to get or initialize personality content generator
function getPersonalityContentGenerator() {
    if (!personalityContentGenerator) {
        personalityContentGenerator = new PersonalityContentGenerator();
    }
    return personalityContentGenerator;
}

// Map subject to content category
const subjectToCategory = {
    'tech': 'tech',
    'lifestyle': 'lifestyle',
    'cooking': 'food',
    'weather': 'weather',
    'provocative': 'personal',
    'health': 'health',
    'travel': 'travel',
    'books': 'books',
    'fitness': 'health',
    'food': 'food',
    'mindfulness': 'lifestyle'
};

const apis = [
    {
        url: 'https://api.quotable.io/random',
        parser: (data) => ({
            content: `"${data.content}" - ${data.author}`,
            context: 'inspiration',
            tags: ['quote', 'wisdom', 'inspiration']
        })
    },
    {
        url: 'https://uselessfacts.jsph.pl/random.json?language=en',
        parser: (data) => ({
            content: decodeHtmlEntities(data.text),
            context: 'fact',
            tags: ['funfact', 'didyouknow', 'interesting']
        })
    },
    {
        url: 'https://numbersapi.com/random/trivia?json=true&type=cs',
        parser: (data) => ({
            content: decodeHtmlEntities(data.text),
            context: 'tech',
            tags: ['tech', 'computerscience', 'coding']
        })
    },
    {
        url: 'https://techcrunch.com/wp-json/wp/v2/posts?per_page=1',
        parser: (data) => ({
            content: `${decodeHtmlEntities(data[0].title.rendered)}\nURL: ${data[0].link}`,
            context: 'news',
            tags: ['tech', 'news', 'technology']
        })
    }
];

// Function to decode HTML entities
function decodeHtmlEntities(text) {
    if (!text) return '';
    
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#8217;/g, "'")
        .replace(/&#8216;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#8211;/g, '–')
        .replace(/&#8212;/g, '—')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
}

// Function to validate and filter hashtags to 12 characters maximum (including #)
function validateHashtags(hashtags) {
    if (!hashtags || hashtags.length === 0) return [];
    
    return hashtags.filter(tag => {
        // Remove # if present for length check
        const tagWithoutHash = tag.startsWith('#') ? tag.slice(1) : tag;
        // Check if hashtag (including #) would be 12 characters or less
        return tagWithoutHash.length <= 11; // 11 chars + 1 for # = 12 total
    }).map(tag => {
        // Ensure hashtag starts with #
        return tag.startsWith('#') ? tag : `#${tag}`;
    });
}

function generateHashtags(personality, content, templateType, apiTags, minTags, maxTags) {
    return '';
}

// Function to ensure content length is between min and max characters
function ensureContentLength(content, minLength, maxLength, category) {
    if (!content) return '';
    
    // If content is already within bounds, return as is
    if (content.length >= minLength && content.length <= maxLength) {
        return content;
    }
    
    // If content is too long, truncate at sentence boundary
    if (content.length > maxLength) {
        let truncated = content.substring(0, maxLength);
        // Find the last sentence boundary
        const lastSentence = truncated.match(/[.!?][^.!?]*$/);
        if (lastSentence) {
            truncated = truncated.substring(0, truncated.length - lastSentence[0].length + 1);
        }
        return truncated.trim();
    }
    
    // If content is too short, add relevant expansions based on category
    let expanded = content;
    
    const expansions = {
        tech: [
            ' This is a fascinating development in the tech world.',
            ' The implications for developers are significant.',
            ' Looking forward to seeing how this evolves.',
            ' This could change how we approach development.'
        ],
        food: [
            ' The flavors are absolutely amazing.',
            ' This recipe is definitely worth trying.',
            ' Perfect for any occasion.',
            ' A great addition to your recipe collection.'
        ],
        lifestyle: [
            ' This has made such a positive impact.',
            ' It\'s all about finding the right balance.',
            ' Small changes can lead to big results.',
            ' Every step forward counts.'
        ],
        weather: [
            ' Nature never ceases to amaze.',
            ' Perfect weather for outdoor activities.',
            ' The conditions are just right.',
            ' Looking forward to more days like this.'
        ]
    };
    
    // Add expansions until we reach minimum length
    while (expanded.length < minLength && expansions[category]) {
        const categoryExpansions = expansions[category];
        const randomExpansion = categoryExpansions[Math.floor(Math.random() * categoryExpansions.length)];
        expanded += randomExpansion;
    }
    
    return expanded.trim();
}

async function fetchApiContent() {
    const shuffledApis = [...apis].sort(() => Math.random() - 0.5);
    apiContentCache.clearOld(); // Clear old cached content

    for (const api of shuffledApis) {
        try {
            const response = await axios.get(api.url, { timeout: 5000 });
            if (response.status === 200) {
                const result = api.parser(response.data);
                
                // Skip if content is already in cache
                if (apiContentCache.hasContent(result.content)) {
                    continue;
                }
                
                // Add to cache and return
                apiContentCache.addContent(api.url, result.content);
                return result;
            }
        } catch (error) {
            console.error(`API ${api.url} failed:`, error.message);
            continue;
        }
    }

    return null;
}

async function generateContent(username) {
    // Get next subject using the rotator
    const subject = subjectRotator.getNextSubject();
    console.log(`[ContentGenerator] Selected subject: ${subject}`);
    
    // Determine if we should use API content based on subject and increase frequency for tech
    const useApiContent = subject === 'tech' || 
        (Math.random() < (config.apiContentFrequency * 1.5) && ['science', 'tech'].includes(subject));
    
    if (useApiContent) {
        const apiData = await fetchApiContent();
        if (apiData) {
            return {
                content: apiData.content.trim(),
                hashtags: '',
                type: 'apiContent',
                category: apiData.context
            };
        }
    }
    
    // Map the selected subject to a content category
    const category = subjectToCategory[subject] || subject;
    console.log(`[ContentGenerator] Mapped subject '${subject}' to category '${category}'`);
    
    // Check if the category exists in contentStructure
    if (!contentStructure[category]) {
        console.log(`[ContentGenerator] Category ${category} not found in content structure, falling back to default`);
        return generateDefaultContent(username);
    }
    
    // Get valid subcategories for this category
    const validSubcategories = Object.keys(contentStructure[category]).filter(sub => {
        // Make sure the subcategory has both openings and endings
        return contentStructure[category][sub] && 
               contentStructure[category][sub].openings && 
               contentStructure[category][sub].endings;
    });
    
    // If no valid subcategories, fall back to default content
    if (validSubcategories.length === 0) {
        console.log(`No valid subcategories found for category ${category}, falling back to default content`);
        return generateDefaultContent(username);
    }
    
    // Get content rotator for this category's subcategories
    const contentRotator = subjectRotator.getContentRotator(category, validSubcategories);
    const specificSubcategory = contentRotator.getNextSubject();
    
    try {
        // Generate content using the rotated subcategory
        const content = generateStructuredContent(category, specificSubcategory);
        
        return {
            content: content.trim(),
            hashtags: '',
            type: specificSubcategory,
            category: category
        };
    } catch (error) {
        console.log(`Error generating content for ${category}/${specificSubcategory}: ${error.message}`);
        return generateDefaultContent(username);
    }
}

// Function to generate default content when other methods fail
function generateDefaultContent(username) {
    const defaultContent = "Just thinking about how amazing technology is and how it continues to evolve every day!";
    
    return {
        content: defaultContent,
        hashtags: '',
        type: 'default',
        category: 'tech'
    };
}

// Generate personality-based content for seed users
async function generatePersonalityContent(username) {
    try {
        console.log(`Generating personality-based content for ${username}`);
        
        const generator = getPersonalityContentGenerator();
        const result = generator.generatePersonalityContent(username);
        
        // Ensure content is strictly cleaned of any hashtags
        let content = result.content;
        
        // Split content and hashtags if they are present at the end
        const parts = content.split('\n\n');
        if (parts.length > 1 && parts[parts.length - 1].includes('#')) {
            content = parts.slice(0, -1).join('\n\n');
        }
        
        // Remove any remaining hashtags throughout the content
        content = content.replace(/#\w+/g, '').trim();
        
        console.log(`Generated personality content for ${username}: ${content.substring(0, 50)}...`);
        
        return {
            content,
            hashtags: '',
            topic: result.topic,
            isPersonalityGenerated: true
        };
        
    } catch (error) {
        console.error(`Error generating personality content for ${username}:`, error);
        // Fallback to default content
        return generateDefaultContent(username);
    }
}

module.exports = {
    generateContent,
    generatePersonalityContent,
    subjectToCategory,
    validateHashtags
}; 
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');
const { createClient } = require('pexels');
const { generateContent, generatePersonalityContent } = require('./contentGenerator');
const { config } = require('./config');
const { startCLI } = require('./cli');
const PersonalityManager = require('./personalityManager');
const CommentManager = require('./commentManager');
const OpenAIContentGenerator = require('./openaiContentGenerator');
const EnhancedCommentManager = require('./enhancedCommentManager');
const { affiliateLinks, categoryToInterests } = require('./affiliateLinks');
const AIChatManager = require('./aiChatManager');
const fs = require('fs');
const path = require('path');

const app = express();

let youtubeContent = [];

// Post type rotation system
const POST_TYPE_ROTATION = [
  'ai_post',
  'api_post', 
  'ai_post',
  'affiliate_ai_post'
];

// AI post type rotation for each AI post
const AI_POST_TYPE_ROTATION = [
  'anecdote',
  'controversial', 
  'informational',
  'controversial'
];

// Track rotation indices
let currentPostTypeIndex = 0;
let currentAiPostTypeIndex = 0;

// Post directions and their prompt instructions
const POST_DIRECTIONS = [
  {
    key: 'anecdote',
    instruction: 'Write this post as a detailed personal anecdote about a specific recent experience related to your interest. Include concrete details like: specific locations, times, people involved, exact conversations, specific actions taken, emotions felt, and outcomes. Make it feel like a real story that actually happened to you. Include specific names, places, dates, or situations that make it believable and engaging. Avoid generic statements - be specific about what happened, where it happened, who was involved, and how it made you feel.'
  },
  {
    key: 'controversial',
    instruction: 'Share a controversial or thought-provoking opinion about a topic related to your interest. Be provocative but stay within appropriate boundaries.'
  },
  {
    key: 'informational',
    instruction: 'Share informative content, tips, or insights about your interest in an educational way.'
  },
  {
    key: 'affiliate',
    instruction: 'Create a convincing product recommendation post that naturally incorporates the product link. Write in your authentic voice based on your personality traits and interests. Make it feel genuine, not overly promotional. Share why this product would be valuable to others with similar interests.'
  }
];

// Function to get next post type with proper rotation
function getNextPostType() {
    const postType = POST_TYPE_ROTATION[currentPostTypeIndex];
    currentPostTypeIndex = (currentPostTypeIndex + 1) % POST_TYPE_ROTATION.length;
    console.log(`[Post Type Rotation] Using post type: ${postType} (index: ${currentPostTypeIndex - 1} -> ${currentPostTypeIndex})`);
    return postType;
}

// Function to get next AI post type with proper rotation
function getNextAiPostType() {
    const aiPostType = AI_POST_TYPE_ROTATION[currentAiPostTypeIndex];
    currentAiPostTypeIndex = (currentAiPostTypeIndex + 1) % AI_POST_TYPE_ROTATION.length;
    console.log(`[AI Post Type Rotation] Using AI post type: ${aiPostType} (index: ${currentAiPostTypeIndex - 1} -> ${currentAiPostTypeIndex})`);
    return aiPostType;
}

// Function to get direction instruction based on AI post type
function getDirectionInstruction(aiPostType) {
    const direction = POST_DIRECTIONS.find(d => d.key === aiPostType);
    return direction ? direction.instruction : POST_DIRECTIONS[0].instruction;
}

// Function to get current rotation status for debugging
function getRotationStatus() {
    return {
        postTypeRotation: {
            currentIndex: currentPostTypeIndex,
            currentType: POST_TYPE_ROTATION[currentPostTypeIndex],
            totalTypes: POST_TYPE_ROTATION.length,
            allTypes: POST_TYPE_ROTATION
        },
        aiPostTypeRotation: {
            currentIndex: currentAiPostTypeIndex,
            currentType: AI_POST_TYPE_ROTATION[currentAiPostTypeIndex],
            totalTypes: AI_POST_TYPE_ROTATION.length,
            allTypes: AI_POST_TYPE_ROTATION
        }
    };
}

// Test function to verify rotation (for debugging)
function testRotation() {
    console.log('\n=== Testing Post Type Rotation ===');
    console.log('Initial state:', getRotationStatus());
    
    for (let i = 0; i < POST_TYPE_ROTATION.length + 2; i++) {
        const postType = getNextPostType();
        console.log(`Step ${i + 1}: Got post type "${postType}"`);
        
        if (postType === 'ai_post') {
            const aiPostType = getNextAiPostType();
            console.log(`  -> AI post type: "${aiPostType}"`);
        }
    }
    
    console.log('Final state:', getRotationStatus());
    console.log('=== Rotation Test Complete ===\n');
}

async function reloadYoutubeContent() {
  try {
    const youtubeListPath = path.join(__dirname, 'youtubelist.json');
    const fileContent = await fs.promises.readFile(youtubeListPath, 'utf8');
    let newContent = [];
    try {
      const videoArray = JSON.parse(fileContent);
      videoArray.forEach(item => {
        if (Array.isArray(item) && item.length >= 2) {
          const url = item[0].replace(/^@/, '');
          const description = item[1];
          if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
            newContent.push({ url, description });
          }
        }
      });
    } catch (parseError) {
      console.error('Error parsing YouTube content array:', parseError);
      // Fallback to old format if JSON parsing fails
      const arrayMatch = fileContent.match(/youtubevids\s*=\s*(\[[\s\S]*\])/);
      if (arrayMatch && arrayMatch[1]) {
        const videoArray = eval(arrayMatch[1]);
        videoArray.forEach(item => {
          if (Array.isArray(item) && item.length >= 2) {
            const url = item[0].replace(/^@/, '');
            const description = item[1];
            if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
              newContent.push({ url, description });
            }
          }
        });
      } else {
        const contentPairs = fileContent.split(/\n\n/);
        contentPairs.forEach(pair => {
          const lines = pair.trim().split('\n');
          if (lines.length >= 2) {
            const url = lines[0].trim();
            const description = lines[1].trim();
            if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
              newContent.push({ url, description });
            }
          }
        });
      }
    }
    // Compare and update if new entries are found
    if (newContent.length !== youtubeContent.length ||
        newContent.some((item, idx) => !youtubeContent[idx] || item.url !== youtubeContent[idx].url || item.description !== youtubeContent[idx].description)) {
      youtubeContent = newContent;
      console.log(`[YouTube List] Reloaded: ${youtubeContent.length} videos loaded at ${new Date().toISOString()}`);
    }
  } catch (error) {
    console.error('Error loading YouTube content list:', error);
  }
}

// Initial load
reloadYoutubeContent();
// Reload every hour
setInterval(reloadYoutubeContent, 60 * 60 * 1000);

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

// Function to randomly select 0-3 hashtags from a hashtag string
function selectRandomHashtags(hashtagString) {
  const hashtags = hashtagString.split(' ').filter(tag => tag.trim());
  
  // Filter out hashtags longer than 12 characters (including #)
  const validHashtags = hashtags.filter(tag => {
    const tagWithoutHash = tag.startsWith('#') ? tag.slice(1) : tag;
    return tagWithoutHash.length <= 11; // 11 chars + 1 for # = 12 total
  });
  
  const numHashtags = Math.floor(Math.random() * 4); // 0-3 hashtags
  
  if (numHashtags === 0) {
    return '';
  }
  
  return validHashtags
    .sort(() => Math.random() - 0.5)
    .slice(0, numHashtags)
    .join(' ');
}

// Function to get random YouTube content
function getRandomYoutubeContent() {
  if (youtubeContent.length === 0) {
    console.log('No YouTube content available');
    return null;
  }
  
  // Get a random YouTube content item from the first N-2 items
  // This ensures a video won't be selected again for at least 2 rounds
  const selectionRange = Math.max(1, youtubeContent.length - 2);
  const randomIndex = Math.floor(Math.random() * selectionRange);
  const content = youtubeContent[randomIndex];
  
  // Move the selected content to the end of the array
  // This implements a rotation mechanism
  youtubeContent.splice(randomIndex, 1);
  youtubeContent.push(content);
  
  console.log(`Selected YouTube video: ${content.url} (${randomIndex+1}/${youtubeContent.length})`);
  
  // Format the content with the URL and description
  const selectedHashtags = selectRandomHashtags('#video #watch #youtube');
  return {
    content: `${content.description}\n\n${content.url}`,
    hashtags: selectedHashtags,
    isApi: false,
    isYoutube: true
  };
}

// Function to generate content from an API
async function getApiContent(randomUser) {
  try {
    // Try up to 3 times to get API content
    for (let attempt = 0; attempt < 3; attempt++) {
      const content = await fetchSeedContent();
      
      // If content contains a URL, make sure it's a valid one
      if (content && content.includes('http')) {
        // Check if it has a valid URL pattern
        const urlPattern = /(https?:\/\/[^\s]+)/;
        if (urlPattern.test(content)) {
          console.log(`Successfully fetched API content (attempt ${attempt + 1})`);
          return {
            content,
            isApi: true
          };
        }
      } else if (content && !content.includes('9GAG')) {
        // Non-URL content that's not from 9GAG is ok
        console.log(`Successfully fetched API content (attempt ${attempt + 1})`);
        return {
          content,
          isApi: true
        };
      }
      
      console.log(`API content attempt ${attempt + 1} failed or returned invalid content, retrying...`);
    }
    
    console.log('All API content attempts failed, falling back to generated content');
    return null;
  } catch (error) {
    console.error('Failed to fetch API content:', error);
    return null;
  }
}

// Function to generate enhanced content using Puter.js with fallback
async function getGeneratedContent(randomUser, directionInstruction = null) {
  try {
    console.log(`Attempting to generate enhanced content for user: ${randomUser.username}`);
    if (!openaiContentGenerator) {
      openaiContentGenerator = new OpenAIContentGenerator();
    }
    const usePersonality = randomUser.user_id >= 1000 && randomUser.user_id <= 9999;
    if (usePersonality) {
      console.log(`Using enhanced personality-based content generation for seed user: ${randomUser.username}`);
    } else {
      console.log(`Using enhanced general content generation for user: ${randomUser.username}`);
    }
    // Pass directionInstruction to generateContent
    const result = await openaiContentGenerator.generateContent(randomUser.username, usePersonality, directionInstruction);
    if (result) {
      const content = result.hashtags ? `${result.content}\n\n${result.hashtags}` : result.content;
      const generationType = result.isOpenAIGenerated ? 'OpenAI' : 'fallback';
      const personalityFlag = result.isPersonalityGenerated ? ' (personality-based)' : '';
      console.log(`Generated content successfully using ${generationType}${personalityFlag}: ${result.content.substring(0, 50)}...`);
      return {
        content,
        isApi: false,
        isPersonalityGenerated: result.isPersonalityGenerated,
        isOpenAIGenerated: result.isOpenAIGenerated,
        topic: result.topic || 'general'
      };
    }
    
    // Final fallback to old system if everything fails
    console.log('Enhanced generation failed, using legacy fallback');
    if (usePersonality) {
      const fallbackResult = await generatePersonalityContent(randomUser.username);
      if (fallbackResult && fallbackResult.isPersonalityGenerated) {
        const content = fallbackResult.hashtags ? `${fallbackResult.content}\n\n${fallbackResult.hashtags}` : fallbackResult.content;
        return {
          content,
          isApi: false,
          isPersonalityGenerated: true,
          isPuterGenerated: false,
          topic: fallbackResult.topic
        };
      }
    }
    
    const { content, hashtags } = await generateContent(randomUser.username);
    return {
                  content: `${content}\n\n${hashtags}`,
            isApi: false,
            isPersonalityGenerated: false,
            isOpenAIGenerated: false
    };
    
  } catch (error) {
    console.error('Failed to generate enhanced content:', error);
    return null;
  }
}

// Function to find users that match specific affiliate categories
async function findUsersForAffiliateCategory(category) {
    try {
        // Get all seed users
        const [allUsers] = await db.promise().query(
            'SELECT user_id, username FROM users WHERE user_id BETWEEN 1000 AND 9999'
        );
        
        if (allUsers.length === 0) {
            return [];
        }
        
        const matchingUsers = [];
        const categoryKeywords = categoryToInterests[category] || [];
        
        for (const user of allUsers) {
            try {
                // Load user's personality data
                const personalityPath = path.join(__dirname, 'seedusers', user.username, `${user.username}_personality.js`);
                
                if (!fs.existsSync(personalityPath)) {
                    continue; // Skip users without personality files
                }
                
                // Clear require cache to ensure fresh load
                delete require.cache[require.resolve(personalityPath)];
                const personalityData = require(personalityPath);
                
                let matchScore = 0;
                
                // Check interests
                if (personalityData.interests && Array.isArray(personalityData.interests)) {
                    const userInterests = personalityData.interests.map(i => i.toLowerCase());
                    
                    for (const interest of userInterests) {
                        if (categoryKeywords.some(keyword => 
                            interest.includes(keyword.toLowerCase()) || 
                            keyword.toLowerCase().includes(interest)
                        )) {
                            matchScore += 2; // Higher weight for direct interest matches
                        }
                    }
                }
                
                // Check personality traits for relevant matches
                if (personalityData.personality_traits && Array.isArray(personalityData.personality_traits)) {
                    const userTraits = personalityData.personality_traits.map(t => t.toLowerCase());
                    
                    // Some traits that might align with certain categories
                    const traitMappings = {
                        tech: ['technical', 'analytical', 'logical', 'programmer', 'developer', 'gamer'],
                        beauty: ['aesthetic', 'beautiful', 'glamorous', 'stylish', 'fashionable'],
                        fitness: ['active', 'energetic', 'health-conscious', 'athletic'],
                        cooking: ['foodie', 'culinary', 'chef'],
                        fashion: ['stylish', 'trendy', 'fashionable', 'aesthetic'],
                        books: ['intellectual', 'thoughtful', 'wise', 'educated'],
                        gardening: ['nature-loving', 'peaceful', 'nurturing'],
                        home_products: ['organized', 'domestic', 'homeowner']
                    };
                    
                    const relevantTraits = traitMappings[category] || [];
                    for (const trait of userTraits) {
                        if (relevantTraits.some(relevantTrait => 
                            trait.includes(relevantTrait) || 
                            relevantTrait.includes(trait)
                        )) {
                            matchScore += 1; // Lower weight for trait matches
                        }
                    }
                }
                
                // Check if user is restricted from affiliate posts
                if (!canUserPostContentType(user.username, 'affiliate')) {
                    console.log(`Skipping ${user.username} for affiliate content due to restrictions`);
                    continue;
                }
                
                // If user has a good match score, add them to the list
                if (matchScore >= 1) {
                    matchingUsers.push({
                        ...user,
                        matchScore
                    });
                }
                
            } catch (error) {
                console.log(`Error checking personality for ${user.username}: ${error.message}`);
                continue;
            }
        }
        
        // Sort by match score (highest first) and return top matches
        return matchingUsers
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 15); // Return top 15 matches
            
    } catch (error) {
        console.error('Error finding users for affiliate category:', error);
        return [];
    }
}

// Function to generate affiliate content
async function getAffiliateContent() {
    try {
        console.log(`[getAffiliateContent] Starting affiliate content generation...`);
        
        // Get all available categories
        const categories = Object.keys(affiliateLinks);
        console.log(`[getAffiliateContent] Available categories:`, categories);
        
        // Select a random category
        const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
        const categoryProducts = affiliateLinks[selectedCategory];
        
        // Select a random product from the category
        const selectedProduct = categoryProducts[Math.floor(Math.random() * categoryProducts.length)];
        
        console.log(`[getAffiliateContent] Selected affiliate category: ${selectedCategory}, product: ${selectedProduct.text.substring(0, 50)}...`);
        
        // Find users that match this category
        console.log(`[getAffiliateContent] Finding users for category: ${selectedCategory}`);
        const matchingUsers = await findUsersForAffiliateCategory(selectedCategory);
        console.log(`[getAffiliateContent] Found ${matchingUsers.length} matching users`);
        
        if (matchingUsers.length === 0) {
            console.log(`[getAffiliateContent] No matching users found for category: ${selectedCategory}`);
            return null;
        }
        
        // Select a user from the top matches (top 3 to add some randomness)
        const selectedUser = matchingUsers[Math.floor(Math.random() * Math.min(3, matchingUsers.length))];
        
        console.log(`Selected user ${selectedUser.username} for affiliate post (match score: ${selectedUser.matchScore})`);
        
        // Generate the affiliate post using OpenAI
        if (!openaiContentGenerator) {
            openaiContentGenerator = new OpenAIContentGenerator();
        }
        
        // Load user's personality data for context
        let personalityData = null;
        try {
            const personalityPath = path.join(__dirname, 'seedusers', selectedUser.username, `${selectedUser.username}_personality.js`);
            if (fs.existsSync(personalityPath)) {
                delete require.cache[require.resolve(personalityPath)];
                personalityData = require(personalityPath);
            }
        } catch (error) {
            console.log(`Could not load personality for ${selectedUser.username}: ${error.message}`);
        }
        
        // Generate affiliate-specific content using a dedicated method
        console.log(`[getAffiliateContent] Calling generateAffiliateContent for user: ${selectedUser.username}`);
        const result = await openaiContentGenerator.generateAffiliateContent(
            selectedUser.username,
            selectedProduct.text,
            selectedProduct.link,
            selectedCategory,
            personalityData
        );
        
        console.log(`[getAffiliateContent] generateAffiliateContent result:`, result ? 'SUCCESS' : 'FAILED');
        if (result && result.content) {
            // Make sure the link is included in the content
            let finalContent = result.content;
            if (!finalContent.includes(selectedProduct.link)) {
                finalContent += `\n\n${selectedProduct.link}`;
            }
            
            // Add hashtags if not already included
            if (result.hashtags && !finalContent.includes('#')) {
                finalContent += `\n\n${result.hashtags}`;
            } else if (!finalContent.includes('#')) {
                // Add some default hashtags based on category (9 characters max including #)
                const defaultHashtags = {
                    tech: '#tech #gadget #rec',
                    beauty: '#beauty #skin #care',
                    fitness: '#fit #health #work',
                    fashion: '#fashion #style #look',
                    gardening: '#garden #plant #green',
                    books: '#book #read #good',
                    cooking: '#cook #food #yum',
                    home_products: '#home #life #need'
                };
                const hashtags = defaultHashtags[selectedCategory] || '#rec #need';
                finalContent += `\n\n${hashtags}`;
            }
            
            console.log(`Generated affiliate content successfully: ${finalContent.substring(0, 50)}...`);
            
            return {
                content: finalContent,
                isApi: false,
                isAffiliate: true,
                isOpenAIGenerated: result.isOpenAIGenerated,
                isPersonalityGenerated: result.isPersonalityGenerated,
                category: selectedCategory,
                user: selectedUser
            };
        }
        
        console.log('[getAffiliateContent] Failed to generate affiliate content with OpenAI');
        return null;
        
    } catch (error) {
        console.error('[getAffiliateContent] Error generating affiliate content:', error);
        return null;
    }
}

// API definitions for seeding content with user matching criteria
const apis = [
    {
        url: 'https://api.quotable.io/random',
        parser: (data) => `"${data.content}" - ${data.author}`,
        hashtags: '#quote #wisdom',
        userCriteria: {
            traits: ['intellectual', 'thoughtful', 'philosophical', 'mature', 'wise'],
            interests: ['philosophy', 'wisdom', 'quotes', 'inspiration', 'motivation', 'self-improvement']
        }
    },
    {
        url: 'https://uselessfacts.jsph.pl/random.json?language=en',
        parser: (data) => decodeHtmlEntities(data.text),
        hashtags: '#fact #cool',
        userCriteria: {
            traits: ['curious', 'intellectual', 'thoughtful', 'analytical'],
            interests: ['science', 'facts', 'learning', 'education', 'knowledge', 'research']
        }
    },
    {
        url: 'https://numbersapi.com/random/trivia?json=true&type=cs',
        parser: (data) => decodeHtmlEntities(data.text),
        hashtags: '#tech #code',
        userCriteria: {
            traits: ['technical', 'analytical', 'logical', 'programmer', 'developer'],
            interests: ['technology', 'programming', 'coding', 'software', 'AI', 'blockchain', 'crypto', 'computers']
        }
    },
    {
        url: 'https://www.boredapi.com/api/activity',
        parser: (data) => `Try this activity: ${decodeHtmlEntities(data.activity)}`,
        hashtags: '#try #life',
        userCriteria: {
            traits: ['adventurous', 'social', 'active', 'energetic', 'outgoing'],
            interests: ['fitness', 'health', 'wellness', 'yoga', 'meditation', 'self-improvement', 'lifestyle', 'activities']
        }
    },
    {
        url: 'https://v2.jokeapi.dev/joke/Any?type=single',
        parser: (data) => `"${decodeHtmlEntities(data.joke)}"`,
        hashtags: '#joke #funny',
        userCriteria: {
            traits: ['humorous', 'funny', 'comedic', 'witty', 'playful', 'humor'],
            interests: ['comedy', 'humor', 'funny', 'jokes', 'memes', 'entertainment', 'laughs']
        }
    },
    // Add Pexels API for images and videos
    {
        url: 'pexels_api',
        parser: async () => {
            try {
                const pexelsApiKey = process.env.PEXELS_API_KEY;
                if (!pexelsApiKey) {
                    console.error('Pexels API key not found in environment variables');
                    return null;
                }
                
                const client = createClient(pexelsApiKey);
                
                // Only fetch photos from Pexels (no videos)
                console.log('Fetching photo from Pexels API');
                
                // Get a random curated photo
                const randomPage = Math.floor(Math.random() * 30) + 1; // Pexels has many pages
                const response = await client.photos.curated({ page: randomPage, per_page: 1 });
                
                if (!response || !response.photos || response.photos.length === 0) {
                    console.error('No photos found in Pexels response');
                    return null;
                }
                
                const photo = response.photos[0];
                const photoUrl = photo.src.large;
                const photoPageUrl = photo.url;
                const photographer = photo.photographer;
                const photographerUrl = photo.photographer_url;
                
                // Format content with proper attribution as required by Pexels
                let content = '';
                if (photo.alt) {
                    content += `${photo.alt}\n\n`;
                }
                
                content += `${photoUrl}\n\n`;
                content += `Photo by ${photographer} - Pexels`;
                
                console.log(`Successfully fetched photo from Pexels: ${photoPageUrl}`);
                return content;
                
            } catch (error) {
                console.error('Error fetching from Pexels API:', error.message);
                return null;
            }
        },
        hashtags: '#photo #view',
        userCriteria: {
            traits: ['creative', 'artistic', 'visual', 'aesthetic', 'beautiful'],
            interests: ['photography', 'art', 'visual', 'creative', 'aesthetic', 'beauty', 'nature', 'landscape', 'design']
        }
    },
    // Add News API for latest news articles
    {
        url: 'news_api',
        parser: async () => {
            try {
                const newsApiKey = process.env.NEWSAPI_KEY;
                if (!newsApiKey) {
                    console.error('News API key not found in environment variables');
                    return null;
                }
                
                console.log('Fetching latest news from Event Registry API');
                
                // Random topics to search for
                const topics = [
                    'Technology', 'Climate Change', 'Space Exploration', 
                    'Artificial Intelligence', 'Health', 'Science', 
                    'Innovation', 'Renewable Energy', 'Tesla Inc', 'Finance', 'Politics'
                ];
                const randomTopic = topics[Math.floor(Math.random() * topics.length)];
                
                const response = await axios.post('https://eventregistry.org/api/v1/article/getArticles', {
                    action: "getArticles",
                    keyword: randomTopic,
                    sourceLocationUri: [
                        "http://en.wikipedia.org/wiki/United_States",
                        "http://en.wikipedia.org/wiki/Canada",
                        "http://en.wikipedia.org/wiki/United_Kingdom"
                    ],
                    ignoreSourceGroupUri: "paywall/paywalled_sources",
                    articlesPage: 1,
                    articlesCount: 5, // Just get a few to choose from
                    articlesSortBy: "date",
                    articlesSortByAsc: false,
                    dataType: ["news", "pr"],
                    forceMaxDataTimeWindow: 31,
                    resultType: "articles",
                    apiKey: newsApiKey
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000 // 10 second timeout
                });
                
                if (!response.data || !response.data.articles || !response.data.articles.results || response.data.articles.results.length === 0) {
                    console.error('No news articles found in Event Registry response');
                    return null;
                }
                
                // Get the first (most recent) article
                const article = response.data.articles.results[0];
                
                // Extract the needed data
                const title = article.title;
                const source = article.source.title;
                const url = article.url;
                let body = article.body || '';
                
                // Create a brief summary (first 2-3 sentences or 150 characters)
                let summary = '';
                if (body) {
                    // Extract first few sentences
                    const sentences = body.split(/[.!?]+/);
                    const firstSentences = sentences.slice(0, 2).join('. ') + '.';
                    summary = firstSentences.length > 150 ? 
                        firstSentences.substring(0, 147) + '...' : 
                        firstSentences;
                } else if (article.summary) {
                    // Use provided summary if available
                    summary = article.summary.length > 150 ? 
                        article.summary.substring(0, 147) + '...' : 
                        article.summary;
                }
                
                // Format the content
                let content = `📰 ${decodeHtmlEntities(title)}\n\n`;
                content += `Read more: ${url}\n\n`;
                content += `Source: ${decodeHtmlEntities(source)}`;
                
                console.log(`Successfully fetched news article: "${title}"`);
                return content;
                
            } catch (error) {
                console.error('Error fetching from News API:', error.message);
                if (error.response) {
                    console.error('API response:', error.response.status);
                    console.error('API response data:', JSON.stringify(error.response.data, null, 2));
                }
                return null;
            }
        },
        hashtags: '#news #today',
        userCriteria: {
            traits: ['intellectual', 'analytical', 'informed', 'curious', 'thoughtful'],
            interests: ['news', 'current events', 'politics', 'technology', 'science', 'business', 'finance', 'world affairs', 'trending']
        }
    }
];

// Function to find users that match specific API criteria
async function findMatchingUsers(apiCriteria) {
    try {
        // Get all seed users
        const [allUsers] = await db.promise().query(
            'SELECT user_id, username FROM users WHERE user_id BETWEEN 1000 AND 9999'
        );
        
        if (allUsers.length === 0) {
            return [];
        }
        
        const matchingUsers = [];
        
        for (const user of allUsers) {
            try {
                // Load user's personality data
                const personalityPath = path.join(__dirname, 'seedusers', user.username, `${user.username}_personality.js`);
                
                if (!fs.existsSync(personalityPath)) {
                    continue; // Skip users without personality files
                }
                
                // Clear require cache to ensure fresh load
                delete require.cache[require.resolve(personalityPath)];
                const personalityData = require(personalityPath);
                
                let matchScore = 0;
                
                // Check personality traits
                if (personalityData.personality_traits && Array.isArray(personalityData.personality_traits)) {
                    const userTraits = personalityData.personality_traits.map(t => t.toLowerCase());
                    const criteriaTraits = apiCriteria.traits.map(t => t.toLowerCase());
                    
                    for (const trait of userTraits) {
                        if (criteriaTraits.some(criteriaTrait => trait.includes(criteriaTrait) || criteriaTrait.includes(trait))) {
                            matchScore += 2; // Higher weight for trait matches
                        }
                    }
                }
                
                // Check interests
                if (personalityData.interests && Array.isArray(personalityData.interests)) {
                    const userInterests = personalityData.interests.map(i => i.toLowerCase());
                    const criteriaInterests = apiCriteria.interests.map(i => i.toLowerCase());
                    
                    for (const interest of userInterests) {
                        if (criteriaInterests.some(criteriaInterest => interest.includes(criteriaInterest) || criteriaInterest.includes(interest))) {
                            matchScore += 1; // Lower weight for interest matches
                        }
                    }
                }
                
                // Check if user is restricted from API posts
                if (!canUserPostContentType(user.username, 'api')) {
                    console.log(`Skipping ${user.username} for API content due to restrictions`);
                    continue;
                }
                
                // If user has a good match score, add them to the list
                if (matchScore >= 1) {
                    matchingUsers.push({
                        ...user,
                        matchScore
                    });
                }
                
            } catch (error) {
                console.log(`Error checking personality for ${user.username}: ${error.message}`);
                continue;
            }
        }
        
        // Sort by match score (highest first) and return top matches
        return matchingUsers
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 10); // Return top 10 matches
            
    } catch (error) {
        console.error('Error finding matching users:', error);
        return [];
    }
}

// Function to get API content and find a matching user
async function getApiContentWithMatchingUser() {
    try {
        // Shuffle APIs to try them in random order
        const shuffledApis = apis.sort(() => Math.random() - 0.5);

        for (const api of shuffledApis) {
            try {
                console.log(`Trying API endpoint: ${api.url}`);
                
                // Special handling for Pexels API which doesn't have a traditional URL
                if (api.url === 'pexels_api') {
                    console.log('Using Pexels API client for media content');
                    const content = await api.parser();
                    
                    if (content === null) {
                        console.log(`Pexels API returned no valid content, trying next API`);
                        continue;
                    }
                    
                    console.log('Successfully parsed content from Pexels API');
                    
                    // Find matching users for Pexels content
                    const matchingUsers = await findMatchingUsers(api.userCriteria);
                    if (matchingUsers.length > 0) {
                        const selectedUser = matchingUsers[Math.floor(Math.random() * Math.min(3, matchingUsers.length))];
                        console.log(`Selected user ${selectedUser.username} for Pexels content (match score: ${selectedUser.matchScore})`);
                        
                        const selectedHashtags = selectRandomHashtags(api.hashtags);
                        const formattedContent = selectedHashtags ? `${content}\n\n${selectedHashtags}`.substring(0, 400).trim() : content.substring(0, 400).trim();
                        
                        return {
                            content: formattedContent,
                            isApi: true,
                            user: selectedUser
                        };
                    }
                }
                
                // Special handling for News API which doesn't have a traditional URL
                if (api.url === 'news_api') {
                    console.log('Using Event Registry API for news content');
                    const content = await api.parser();
                    
                    if (content === null) {
                        console.log(`News API returned no valid content, trying next API`);
                        continue;
                    }
                    
                    console.log('Successfully parsed content from News API');
                    
                    // Find matching users for News content
                    const matchingUsers = await findMatchingUsers(api.userCriteria);
                    if (matchingUsers.length > 0) {
                        const selectedUser = matchingUsers[Math.floor(Math.random() * Math.min(3, matchingUsers.length))];
                        console.log(`Selected user ${selectedUser.username} for News content (match score: ${selectedUser.matchScore})`);
                        
                        const selectedHashtags = selectRandomHashtags(api.hashtags);
                        const formattedContent = selectedHashtags ? `${content}\n\n${selectedHashtags}`.substring(0, 400).trim() : content.substring(0, 400).trim();
                        
                        return {
                            content: formattedContent,
                            isApi: true,
                            user: selectedUser
                        };
                    }
                }
                
                // For regular APIs, make HTTP request
                const response = await axios.get(api.url, { 
                    timeout: 5000,
                    headers: {}
                });
                
                if (response.status === 200) {
                    // Parse the content
                    const isAsyncParser = api.parser.constructor.name === 'AsyncFunction';
                    let content;
                    if (isAsyncParser) {
                        content = await api.parser(response.data);
                    } else {
                        content = api.parser(response.data);
                    }
                    
                    if (content === null) {
                        console.log(`API ${api.url} returned no valid content, trying next API`);
                        continue;
                    }
                    
                    console.log(`Successfully parsed content from ${api.url}`);
                    
                    // Find matching users for this API content
                    const matchingUsers = await findMatchingUsers(api.userCriteria);
                    if (matchingUsers.length > 0) {
                        const selectedUser = matchingUsers[Math.floor(Math.random() * Math.min(3, matchingUsers.length))];
                        console.log(`Selected user ${selectedUser.username} for ${api.url} content (match score: ${selectedUser.matchScore})`);
                        
                        // Format the content with hashtags
                        const selectedHashtags = selectRandomHashtags(api.hashtags);
                        let formattedContent;
                        if (content.includes('URL:') || content.includes('http')) {
                            formattedContent = selectedHashtags ? `${content} ${selectedHashtags}`.substring(0, 400).trim() : content.substring(0, 400).trim();
                        } else {
                            formattedContent = selectedHashtags ? `${content}\n\n${selectedHashtags}`.substring(0, 400).trim() : content.substring(0, 400).trim();
                        }
                        
                        return {
                            content: formattedContent,
                            isApi: true,
                            user: selectedUser
                        };
                    }
                } else {
                    console.log(`API ${api.url} returned status ${response.status}`);
                }
            } catch (error) {
                console.error(`API ${api.url} failed:`, error.message);
                continue;
            }
        }
        
        console.log('All APIs failed, returning null');
        return null;
        
    } catch (error) {
        console.error('Failed to get API content with matching user:', error);
        return null;
    }
}

async function fetchSeedContent() {
    // Shuffle APIs to try them in random order
    const shuffledApis = apis.sort(() => Math.random() - 0.5);

    for (const api of shuffledApis) {
        try {
            console.log(`Trying API endpoint: ${api.url}`);
            
            // Special handling for Pexels API which doesn't have a traditional URL
            if (api.url === 'pexels_api') {
                console.log('Using Pexels API client for media content');
                // Since the Pexels parser is already asynchronous and handles the API calls internally
                const content = await api.parser();
                
                // Skip this API if parser returned null (no valid content found)
                if (content === null) {
                    console.log(`Pexels API returned no valid content, trying next API`);
                    continue;
                }
                
                console.log('Successfully parsed content from Pexels API');
                
                // Format the content with hashtags
                const selectedHashtags = selectRandomHashtags(api.hashtags);
                return selectedHashtags ? `${content}\n\n${selectedHashtags}`.substring(0, 400).trim() : content.substring(0, 400).trim();
            }
            
            // Special handling for News API which doesn't have a traditional URL
            if (api.url === 'news_api') {
                console.log('Using Event Registry API for news content');
                // Since the News parser is already asynchronous and handles the API calls internally
                const content = await api.parser();
                
                // Skip this API if parser returned null (no valid content found)
                if (content === null) {
                    console.log(`News API returned no valid content, trying next API`);
                    continue;
                }
                
                console.log('Successfully parsed content from News API');
                
                // Format the content with hashtags
                const selectedHashtags = selectRandomHashtags(api.hashtags);
                return selectedHashtags ? `${content}\n\n${selectedHashtags}`.substring(0, 400).trim() : content.substring(0, 400).trim();
            }
            
            // Set appropriate headers based on the API
            let headers = {};
            let timeout = 5000;
            
            const response = await axios.get(api.url, { 
                timeout: timeout,
                headers: headers
            });
            
            if (response.status === 200) {
                // Check if we got a valid response
                if (api.url.includes('9gag')) {
                    console.log(`9GAG response received. Content length: ${response.data.length}`);
                    
                    // Check if the response looks like HTML
                    if (typeof response.data === 'string' && response.data.includes('<html')) {
                        console.log('Response appears to be HTML, parsing...');
                    } else {
                        console.log('Response does not appear to be HTML');
                    }
                }
                
                // Parse the content with the API's parser
                // Check if parser is asynchronous
                const isAsyncParser = api.parser.constructor.name === 'AsyncFunction';
                
                let content;
                if (isAsyncParser) {
                    content = await api.parser(response.data);
                } else {
                    content = api.parser(response.data);
                }
                
                // Skip this API if parser returned null (no valid content found)
                if (content === null) {
                    console.log(`API ${api.url} returned no valid content, trying next API`);
                    continue;
                }
                
                console.log(`Successfully parsed content from ${api.url}`);
                
                // Format the content with hashtags
                const selectedHashtags = selectRandomHashtags(api.hashtags);
                if (content.includes('URL:') || content.includes('http')) {
                    return selectedHashtags ? `${content} ${selectedHashtags}`.substring(0, 400).trim() : content.substring(0, 400).trim();
                }
                return selectedHashtags ? `${content}\n\n${selectedHashtags}`.substring(0, 400).trim() : content.substring(0, 400).trim();
            } else {
                console.log(`API ${api.url} returned status ${response.status}`);
            }
        } catch (error) {
            console.error(`API ${api.url} failed:`, error.message);
            if (error.response) {
                console.error(`Status code: ${error.response.status}`);
                console.error(`Headers:`, JSON.stringify(error.response.headers, null, 2));
            }
            continue;
        }
    }

    console.log('All APIs failed, returning fallback content');
    const fallbackHashtags = selectRandomHashtags('#tech #random #mood');
    return fallbackHashtags ? `Just thinking about how amazing technology is! 💭\n\n${fallbackHashtags}` : "Just thinking about how amazing technology is! 💭";
}

let db;
let seedPostCounter = 0; // We'll replace this with database tracking
let lastPostWasApi = false; // Track whether the last post was from an API
let personalityManager = null;
let commentManager = null;
let openaiContentGenerator = null;
let enhancedCommentManager = null;

// Function to check if required database tables exist
async function checkTablesExist() {
    try {
        const requiredTables = ['users', 'posts', 'comments', 'topics', 'sessions'];
        const [tables] = await db.promise().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ?
        `, [process.env.DB_NAME]);
        
        const existingTables = tables.map(t => t.TABLE_NAME);
        const missingTables = requiredTables.filter(t => !existingTables.includes(t));
        
        if (missingTables.length > 0) {
            console.log(`Waiting for tables to be created: ${missingTables.join(', ')}`);
            return false;
        }
        
        return true;
    } catch (err) {
        console.error('Error checking tables:', err);
        return false;
    }
}

// Function to wait for tables with retry
async function waitForTables(maxRetries = 30, delay = 5000) {
    let retries = 0;
    
    while (retries < maxRetries) {
        const tablesExist = await checkTablesExist();
        if (tablesExist) {
            console.log('All required tables are available. Ready to seed data.');
            return true;
        }
        
        console.log(`Tables not ready yet. Retry ${retries+1}/${maxRetries} in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
    }
    
    console.error('Timed out waiting for database tables to be created');
    return false;
}

// Function to create test users if they don't exist
async function createTestUsers() {
    try {
        // List of seed usernames
        const seedUsers = [
            'PixelForge88',
            'NullVortex',
            'EchoByte_7',
            'CyberDriftX',
            'BitPhantom',
            'QuantumSnaps',
            'GlitchMancer',
            'CryptoNova42',
            'ZeroLagZed',
            'OverSoul',
            'SunnyDays23',
            'finger_clicks',
            'CoffeeAddict99',
            'BookWorm_Reader',
            'TravelBug2023',
            'Dannyboy',
            'MusicLover426',
            'GreenThumb_88',
            'YogaFlow_22',
            'MovieBuff101',
            'seasideLife',
            'Urban_Wanderer',
            'PomsAreBest',
            'ArtOfShame',
            'FitnessJourney',
            'CuriousMind55',
            'SilverLining_',
            'WanderlustSoul',
            'johnyforlife',
            'knee',
            'StarGazer78',
            'SunsetChaser',
            'weekendBaker',
            '__smoke__',
            'CoffeeFirst_',
            'HikingTrails',
            'OceanBreeze22',
            'ArtisticSoul99',
            'object_Object',
            'SkyWatcher_7',
            'PlantParent25',
            'pocket_lint',
            'jazzGuzzler',
            'NatureLover69',
            'pigeonfart',
            // Added womanly and sexy usernames
            'melissa_ton',
            'VelvetVixen',
            'ScarletMuse',
            'SatinSiren',
            'BlissfulBabe',
            'helenbae',
            'SilkyIvy',
            'GlamourGaze',
            'RubyDesire',
            'MidnightDahlia',
            'CocoLuxe',
            'SunkissedSasha',
            'LoveeDovee',
            'CherryTammy',
            'BellaFever',
            'kittyplum',
            'JadeAllure',
            'OpalEnchant',
            'SableMyst',
            'DesiBliss',
            'VivaVera',
            'GPT_cake'
        ];

        // First, ensure auto_increment is set correctly
        await db.promise().query('ALTER TABLE users AUTO_INCREMENT = 1000');

        // Fetch all existing users in the seed range
        const [existing] = await db.promise().query(
            'SELECT user_id, username, email FROM users WHERE user_id BETWEEN 1000 AND 9999'
        );
        const existingByUsername = new Map();
        const existingByUserId = new Map();
        existing.forEach(u => {
            existingByUsername.set(u.username, u);
            existingByUserId.set(u.user_id, u);
        });

        let created = 0, updated = 0;
        for (let i = 0; i < seedUsers.length; i++) {
            const username = seedUsers[i];
            const userId = 1000 + i;
            const intendedEmail = `${username.toLowerCase()}@icomly.com`;
            const password = '$2b$10$6KVlm8VfUJ.eSPrKBc3qWepNKbPdYc.TRFw0wLgdKnC8ckZGN5zY.';
            
            const existingUserByName = existingByUsername.get(username);
            const existingUserById = existingByUserId.get(userId);

            // Check if either the username or user_id already exists
            if (!existingUserByName && !existingUserById) {
                // Neither username nor user_id exists, safe to insert
                try {
                    await db.promise().query(
                        `INSERT INTO users (user_id, username, email, password) VALUES (?, ?, ?, ?)`,
                        [userId, username, intendedEmail, password]
                    );
                    console.log(`Created seed user: ${username} with ID ${userId}`);
                    created++;
                } catch (err) {
                    console.error(`Error creating seed user ${username}:`, err);
                }
            } else if (existingUserByName && existingUserByName.user_id === userId) {
                // User exists with correct username and user_id, just update email if needed
                if (!existingUserByName.email.endsWith('@icomly.com')) {
                    try {
                        await db.promise().query(
                            `UPDATE users SET email = ? WHERE user_id = ?`,
                            [intendedEmail, existingUserByName.user_id]
                        );
                        console.log(`Updated email for seed user: ${username} to ${intendedEmail}`);
                        updated++;
                    } catch (err) {
                        console.error(`Error updating email for seed user ${username}:`, err);
                    }
                }
            } else {
                // Conflict: either username exists with different user_id, or user_id exists with different username
                if (existingUserByName) {
                    console.log(`Skipping seed user ${username}: username exists with different user_id (${existingUserByName.user_id})`);
                }
                if (existingUserById) {
                    console.log(`Skipping seed user ${username}: user_id ${userId} exists with different username (${existingUserById.username})`);
                }
            }
        }
        console.log(`Seed users creation completed. Created: ${created}, Updated: ${updated}`);
    } catch (err) {
        console.error('Error creating seed users:', err);
    }
}

// Function to copy seed user profile pictures to the pictures volume
async function copySeedUserProfilePictures() {
    try {
        console.log('Starting seed user profile picture copying process...');
        
        // Define the pictures directory path (mounted volume)
        const PICTURES_DIR = path.join(__dirname, 'pictures');
        const SEEDUSERS_DIR = path.join(__dirname, 'seedusers');
        
        // Create pictures directory if it doesn't exist
        if (!fs.existsSync(PICTURES_DIR)) {
            fs.mkdirSync(PICTURES_DIR, { recursive: true });
            console.log('Created pictures directory:', PICTURES_DIR);
        }
        
        // Get all existing seed users from database
        const [seedUsers] = await db.promise().query(
            'SELECT user_id, username FROM users WHERE user_id BETWEEN 1000 AND 9999'
        );
        
        let copiedCount = 0;
        let skippedCount = 0;
        
        for (const user of seedUsers) {
            const { user_id, username } = user;
            
            // Source directory: seedusers/{username}/profilepic/
            const sourceDirPath = path.join(SEEDUSERS_DIR, username, 'profilepic');
            
            // Destination directory: pictures/{user_id}/profilepic/
            const destDirPath = path.join(PICTURES_DIR, user_id.toString(), 'profilepic');
            
            // Check if source directory exists
            if (!fs.existsSync(sourceDirPath)) {
                console.log(`Source profilepic directory not found for user ${username}: ${sourceDirPath}`);
                continue;
            }
            
            // Read all files in source directory
            const files = fs.readdirSync(sourceDirPath);
            
            // Filter to only image files (skip .gitkeep and other non-image files)
            const imageFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
            });
            
            if (imageFiles.length === 0) {
                console.log(`No profile picture found for user ${username}`);
                skippedCount++;
                continue;
            }
            
            // Copy the first image file found (there should typically be only one)
            const sourceFile = imageFiles[0];
            const sourcePath = path.join(sourceDirPath, sourceFile);
            const destPath = path.join(destDirPath, sourceFile);
            const regularPath = `pictures/${user_id}/profilepic/${sourceFile}`;
            
            // Check if user already has this profile picture path in database
            const [existingProfile] = await db.promise().query(
                'SELECT profilepath FROM users WHERE user_id = ?',
                [user_id]
            );
            
            const currentProfilePath = existingProfile[0]?.profilepath;
            
            // Skip if file already exists AND database already has the correct path
            if (fs.existsSync(destPath) && currentProfilePath === regularPath) {
                console.log(`Profile picture already set for user ${username}: ${sourceFile}`);
                skippedCount++;
                continue;
            }
            
            try {
                console.log(`Attempting to copy profile picture for user ${username} (ID: ${user_id})`);
                console.log(`Source: ${sourcePath}`);
                console.log(`Destination directory: ${destDirPath}`);
                console.log(`Destination file: ${destPath}`);
                
                // Create destination directory if it doesn't exist
                if (!fs.existsSync(destDirPath)) {
                    console.log(`Creating destination directory: ${destDirPath}`);
                    fs.mkdirSync(destDirPath, { recursive: true });
                    console.log(`Directory created successfully`);
                } else {
                    console.log(`Destination directory already exists: ${destDirPath}`);
                }
                
                // Verify source file exists
                if (!fs.existsSync(sourcePath)) {
                    console.error(`Source file does not exist: ${sourcePath}`);
                    continue;
                }
                
                // Copy the file (overwrite if necessary)
                console.log(`Copying file from ${sourcePath} to ${destPath}`);
                fs.copyFileSync(sourcePath, destPath);
                
                // Verify the file was copied
                if (fs.existsSync(destPath)) {
                    console.log(`File copied successfully and verified: ${destPath}`);
                } else {
                    console.error(`File copy failed - destination file does not exist: ${destPath}`);
                    continue;
                }
                
                // Update database with the profile picture path
                console.log(`Updating database with path: ${regularPath}`);
                await db.promise().query(
                    'UPDATE users SET profilepath = ? WHERE user_id = ?',
                    [regularPath, user_id]
                );
                
                console.log(`Successfully copied profile picture for user ${username} (ID: ${user_id}): ${sourceFile}`);
                console.log(`Updated database profilepath for user ${username}: ${regularPath}`);
                copiedCount++;
            } catch (err) {
                console.error(`Error copying profile picture for user ${username}:`, err);
                console.error(`Error details:`, err.message);
                console.error(`Error stack:`, err.stack);
            }
        }
        
        console.log(`Profile picture copying completed. Copied: ${copiedCount}, Skipped: ${skippedCount}`);
        
    } catch (err) {
        console.error('Error copying seed user profile pictures:', err);
    }
}

// Function to check if a user should be restricted from certain content types
function getUserContentRestrictions(username) {
    const restrictions = {
        'GPT_cake': {
            noAnecdotes: true,
            noAffiliatePosts: true,
            noApiPosts: true
        }
    };
    
    return restrictions[username] || {};
}

// Function to check if a user can post a specific content type
function canUserPostContentType(username, contentType) {
    const restrictions = getUserContentRestrictions(username);
    
    if (contentType === 'anecdote' && restrictions.noAnecdotes) {
        return false;
    }
    if (contentType === 'affiliate' && restrictions.noAffiliatePosts) {
        return false;
    }
    if (contentType === 'api' && restrictions.noApiPosts) {
        return false;
    }
    
    return true;
}

function extractHashtags(content) {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);
    return matches ? matches
        .filter(tag => {
            // Filter out hashtags longer than 12 characters (including #)
            const tagWithoutHash = tag.slice(1); // Remove # for length check
            return tagWithoutHash.length <= 11; // 11 chars + 1 for # = 12 total
        })
        .map(tag => tag.slice(1)) 
        : [];
}

// Content type tracking
let lastContentType = null; // Will be 'api', 'generated', or 'youtube'

async function seedPost() {
    try {
        // Check if tables exist before attempting to seed
        if (!await checkTablesExist()) {
            console.log('Database tables not ready yet. Will try again later.');
            return;
        }
        
        // First verify that we have seed users
        const [seedUsers] = await db.promise().query(
            'SELECT COUNT(*) as count FROM users WHERE user_id BETWEEN 1000 AND 9999'
        );
        
        if (seedUsers[0].count === 0) {
            console.log('No seed users found. Skipping post creation.');
            return;
        }

        // We'll select the user based on content type later
        let selectedUser = null;
        
        // Use the new post type rotation system
        const nextPostType = getNextPostType();
        let nextContentType;
        
        // Map post types to content types
        switch (nextPostType) {
            case 'ai_post':
                nextContentType = 'generated';
                break;
            case 'api_post':
                nextContentType = 'api';
                break;
            case 'affiliate_ai_post':
                nextContentType = 'affiliate';
                break;
            default:
                nextContentType = 'generated';
        }
        
        console.log(`[Post Rotation Debug] Selected post type: ${nextPostType}, mapped to content type: ${nextContentType}`);
        
        let contentResult = null;
        let directionInstruction = null;
        
        // Try to get the desired content type first
        if (nextContentType === 'api') {
            // For API content, first get the content, then find a matching user
            contentResult = await getApiContentWithMatchingUser();
            if (contentResult && contentResult.user) {
                selectedUser = contentResult.user;
                // Remove user from contentResult to avoid issues
                delete contentResult.user;
            }
        } else if (nextContentType === 'generated') {
            // For generated content, select a random user first
            const [users] = await db.promise().query(
                'SELECT user_id, username FROM users WHERE user_id BETWEEN 1000 AND 9999 AND username LIKE ? ORDER BY RAND() LIMIT 1',
                ['%']
            );
            if (users.length > 0) {
                selectedUser = users[0];
                
                // Check if selected user can post this content type
                const aiPostType = getNextAiPostType();
                const isAnecdote = aiPostType === 'anecdote';
                
                if (!canUserPostContentType(selectedUser.username, isAnecdote ? 'anecdote' : 'generated')) {
                    console.log(`User ${selectedUser.username} is restricted from posting ${isAnecdote ? 'anecdotes' : 'generated content'}, selecting different user`);
                    // Try to find another user that can post this content type
                    const [alternativeUsers] = await db.promise().query(
                        'SELECT user_id, username FROM users WHERE user_id BETWEEN 1000 AND 9999 AND username NOT LIKE ? ORDER BY RAND() LIMIT 1',
                        [selectedUser.username]
                    );
                    if (alternativeUsers.length > 0) {
                        selectedUser = alternativeUsers[0];
                    }
                }
                
                // Use AI post type rotation
                directionInstruction = getDirectionInstruction(aiPostType);
                contentResult = await getGeneratedContent(selectedUser, directionInstruction);
            }

        } else if (nextContentType === 'affiliate') {
            console.log(`[Affiliate Debug] Attempting to generate affiliate content...`);
            // For affiliate content, use the affiliate direction specifically
            const affiliateDir = POST_DIRECTIONS.find(d => d.key === 'affiliate');
            if (affiliateDir) {
                directionInstruction = affiliateDir.instruction;
            }
            contentResult = await getAffiliateContent();
            console.log(`[Affiliate Debug] getAffiliateContent result:`, contentResult ? 'SUCCESS' : 'FAILED');
            if (contentResult && contentResult.user) {
                selectedUser = contentResult.user;
                console.log(`[Affiliate Debug] Selected user for affiliate post: ${selectedUser.username}`);
                // Remove user from contentResult to avoid issues
                delete contentResult.user;
            } else {
                console.log(`[Affiliate Debug] No user selected for affiliate post`);
            }
        }
        
        // If primary content type failed, try alternatives in sequence
        if (!contentResult) {
            // Try generated content if not already attempted
            if (nextContentType !== 'generated') {
                const [users] = await db.promise().query(
                    'SELECT user_id, username FROM users WHERE user_id BETWEEN 1000 AND 9999 AND username LIKE ? ORDER BY RAND() LIMIT 1',
                    ['%']
                );
                if (users.length > 0) {
                    selectedUser = users[0];
                    
                    // Check if selected user can post this content type
                    const aiPostType = getNextAiPostType();
                    const isAnecdote = aiPostType === 'anecdote';
                    
                    if (!canUserPostContentType(selectedUser.username, isAnecdote ? 'anecdote' : 'generated')) {
                        console.log(`User ${selectedUser.username} is restricted from posting ${isAnecdote ? 'anecdotes' : 'generated content'}, selecting different user`);
                        // Try to find another user that can post this content type
                        const [alternativeUsers] = await db.promise().query(
                            'SELECT user_id, username FROM users WHERE user_id BETWEEN 1000 AND 9999 AND username NOT LIKE ? ORDER BY RAND() LIMIT 1',
                            [selectedUser.username]
                        );
                        if (alternativeUsers.length > 0) {
                            selectedUser = alternativeUsers[0];
                        }
                    }
                    
                    // Use AI post type rotation
                    directionInstruction = getDirectionInstruction(aiPostType);
                    contentResult = await getGeneratedContent(selectedUser, directionInstruction);
                    nextContentType = 'generated';
                }
            }
            
            // Try API content if not already attempted
            if (!contentResult && nextContentType !== 'api') {
                contentResult = await getApiContentWithMatchingUser();
                if (contentResult && contentResult.user) {
                    selectedUser = contentResult.user;
                    delete contentResult.user;
                }
                nextContentType = 'api';
            }
            
            // Try affiliate content if not already attempted
            if (!contentResult && nextContentType !== 'affiliate') {
                console.log(`[Affiliate Fallback Debug] Attempting affiliate content as fallback...`);
                contentResult = await getAffiliateContent();
                console.log(`[Affiliate Fallback Debug] getAffiliateContent result:`, contentResult ? 'SUCCESS' : 'FAILED');
                if (contentResult && contentResult.user) {
                    selectedUser = contentResult.user;
                    console.log(`[Affiliate Fallback Debug] Selected user for affiliate post: ${selectedUser.username}`);
                    delete contentResult.user;
                }
                nextContentType = 'affiliate';
            }
        }
        
        // If all methods failed, use a fallback message
        if (!contentResult || !selectedUser) {
            // Get a random user for fallback
            const [users] = await db.promise().query(
                'SELECT user_id, username FROM users WHERE user_id BETWEEN 1000 AND 9999 AND username LIKE ? ORDER BY RAND() LIMIT 1',
                ['%']
            );
            if (users.length > 0) {
                selectedUser = users[0];
                
                // For fallback, we don't apply restrictions since it's emergency content
                console.log(`Using fallback user: ${selectedUser.username} for emergency content`);
            } else {
                console.log('No eligible seed users found. Skipping post creation.');
                return;
            }
            
            contentResult = {
                content: "Just another day in the digital world! Thoughts? #tech #random",
                isApi: false,
                isYoutube: false
            };
            nextContentType = 'generated';
        }

        // Update the tracking variable for the next post
        lastContentType = nextContentType;
        
        // Log the content source for debugging
        console.log(`Creating ${nextContentType} content post`);
        if (directionInstruction) {
            console.log(`Using direction instruction: ${directionInstruction.substring(0, 50)}...`);
        }
        console.log(`Last content type was: ${lastContentType}`);

        // Insert the post
        const [result] = await db.promise().query(
            `INSERT INTO posts (
                user_id, 
                post_content, 
                post_date,
                upvotes,
                downvotes,
                post_comments,
                base_rating
            ) VALUES (?, ?, NOW(), '[]', '[]', 0, 20)`,
            [
                selectedUser.user_id,
                contentResult.content
            ]
        );

        const generationInfo = contentResult.isOpenAIGenerated ? '[OpenAI]' : '[Fallback]';
        const personalityInfo = contentResult.isPersonalityGenerated ? ' (Personality)' : '';
        const affiliateInfo = contentResult.isAffiliate ? ` (Category: ${contentResult.category})` : '';
        const directionInfo = directionInstruction ? ` (Direction: ${POST_DIRECTIONS.find(d => d.instruction === directionInstruction)?.key || 'unknown'})` : '';
        console.log(`Seed post created - User: ${selectedUser.username} (ID: ${selectedUser.user_id}), Post ID: ${result.insertId}, Type: ${nextContentType} ${generationInfo}${personalityInfo}${affiliateInfo}${directionInfo}`);

        // Extract and update topics
        const hashtags_content = contentResult.content;
        const hashtags_array = extractHashtags(hashtags_content);
        
        // If it's a YouTube post and has no hashtags, add some default ones (9 chars max)
        if (nextContentType === 'youtube' && hashtags_array.length === 0) {
            ['video', 'watch', 'share'].forEach(async (topic) => {
                try {
                    let query = `
                        UPDATE topics 
                        SET topic_rank = topic_rank + 1, last_updated = CURRENT_TIMESTAMP
                        WHERE topic = ?
                    `;
                    
                    let [updateResult] = await db.promise().query(query, [topic]);
                    
                    if (updateResult.affectedRows === 0) {
                        query = `
                            INSERT INTO topics (topic, topic_rank, last_updated) 
                            VALUES (?, 10, CURRENT_TIMESTAMP)
                            ON DUPLICATE KEY UPDATE topic_rank = topic_rank + 1, last_updated = CURRENT_TIMESTAMP
                        `;
                        await db.promise().query(query, [topic]);
                    }
                } catch (err) {
                    console.error(`Failed to update topic ${topic}:`, err);
                }
            });
        } else if (nextContentType === 'affiliate' && hashtags_array.length === 0) {
            // If it's an affiliate post and has no hashtags, add some default ones (9 chars max)
            ['rec', 'product', 'affiliate'].forEach(async (topic) => {
                try {
                    let query = `
                        UPDATE topics 
                        SET topic_rank = topic_rank + 1, last_updated = CURRENT_TIMESTAMP
                        WHERE topic = ?
                    `;
                    
                    let [updateResult] = await db.promise().query(query, [topic]);
                    
                    if (updateResult.affectedRows === 0) {
                        query = `
                            INSERT INTO topics (topic, topic_rank, last_updated) 
                            VALUES (?, 10, CURRENT_TIMESTAMP)
                            ON DUPLICATE KEY UPDATE topic_rank = topic_rank + 1, last_updated = CURRENT_TIMESTAMP
                        `;
                        await db.promise().query(query, [topic]);
                    }
                } catch (err) {
                    console.error(`Failed to update topic ${topic}:`, err);
                }
            });
        } else {
            // Update topics for non-YouTube posts or YouTube posts with hashtags
            for (const topic of hashtags_array) {
                try {
                    let query = `
                        UPDATE topics 
                        SET topic_rank = topic_rank + 1, last_updated = CURRENT_TIMESTAMP
                        WHERE topic = ?
                    `;
                    
                    let [updateResult] = await db.promise().query(query, [topic]);
                    
                    if (updateResult.affectedRows === 0) {
                        query = `
                            INSERT INTO topics (topic, topic_rank, last_updated) 
                            VALUES (?, 10, CURRENT_TIMESTAMP)
                            ON DUPLICATE KEY UPDATE topic_rank = topic_rank + 1, last_updated = CURRENT_TIMESTAMP
                        `;
                        await db.promise().query(query, [topic]);
                    }
                } catch (err) {
                    console.error(`Failed to update topic ${topic}:`, err);
                    continue;
                }
            }
        }

    } catch (err) {
        console.error('Failed to seed post:', err);
    }
}

// Robust async loop for seeding posts at fixed intervals
async function startFixedSeedingInterval() {
    console.log(`[Seeding Interval] Starting robust seeding loop with interval: ${config.postIntervalMin} ms (${(config.postIntervalMin/60000).toFixed(2)} minutes)`);
    while (true) {
        const start = Date.now();
        console.log(`[Seeding Interval] seedPost START at ${new Date(start).toISOString()}`);
        try {
            await seedPost();
        } catch (err) {
            console.error('[Seeding Interval] Error in seedPost:', err);
        }
        const end = Date.now();
        const duration = ((end - start) / 1000).toFixed(2);
        console.log(`[Seeding Interval] seedPost END at ${new Date(end).toISOString()} (duration: ${duration} seconds)`);
        // Wait for the configured interval before next post
        await new Promise(resolve => setTimeout(resolve, config.postIntervalMin));
    }
}

const PORT = process.env.PORT || 5050;

// Initialize database connection and start seeding
(async () => {
    try {
        db = mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        db.connect(async (err) => {
            if (err) {
                console.error('Error connecting to the database:', err.stack);
                process.exit(1);
            }
            console.log('Connected to database.');
            
            // Start server
            app.listen(PORT, () => {
                console.log(`Seeding service is running on port ${PORT}`);
                
                // Wait for tables to be created before starting the seeding process
                waitForTables().then(async ready => {
                    if (ready) {
                        // Create test users first
                        await createTestUsers();
                        
                        // Copy seed user profile pictures
                        await copySeedUserProfilePictures();
                        
                        // Initialize personality, content, and comment managers
                        personalityManager = new PersonalityManager();
                        openaiContentGenerator = new OpenAIContentGenerator();
                        global.openaiContentGenerator = openaiContentGenerator;

                        // Only EnhancedCommentManager, with proper try/catch
                        try {
                            enhancedCommentManager = new EnhancedCommentManager(db);
                            console.log('Enhanced personality, content, and comment managers initialized');
                            enhancedCommentManager.startPeriodicCommentGeneration(8);
                        } catch (error) {
                            console.error('Enhanced comment manager failed to initialize:', error.message);
                        }
                        
                        // Topic decay system is now handled by postctl service
                        // This ensures no duplicate processing and better separation of concerns
                        
                        // Start seeding
                        startFixedSeedingInterval();
                        seedPost();

                        // Initialize AI Chat Manager
                        const aiChatManager = new AIChatManager();
                        console.log('AI Chat Manager initialized');

                        // Start CLI
                        startCLI().catch(console.error);
                    } else {
                        console.error('Could not start seeding because database tables are not available');
                    }
                });
            });
        });
    } catch (err) {
        console.error('Failed to connect to database:', err);
        process.exit(1);
    }
})();
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
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
    instruction: 'Write this post as a detailed personal anecdote about a specific recent experience related to celebrity gossip or your outgoing life (sightings, clubs, high-end lifestyle). Include concrete details like: specific locations, times, people involved, exact conversations, specific actions taken, emotions felt, and outcomes. Make it feel like a real story that actually happened to you. Include specific names, places, dates, or situations that make it believable and engaging. Avoid generic statements - be specific about what happened, where it happened, who was involved, and how it made you feel. ABSOLUTELY NO HASHTAGS.'
  },
  {
    key: 'controversial',
    instruction: 'Share a controversial or thought-provoking opinion about celebrity gossip or the hollywood lifestyle. Be provocative but stay within appropriate boundaries. ABSOLUTELY NO HASHTAGS.'
  },
  {
    key: 'informational',
    instruction: 'Share informative celebrity news, tips on the high-end lifestyle, or insights about the industry in an engaging way. ABSOLUTELY NO HASHTAGS.'
  },
  {
    key: 'affiliate',
    instruction: 'Create a convincing product recommendation post that naturally incorporates the product link. Write in your authentic voice based on your personality traits and interests. Make it feel like a genuine find for someone living an outgoing, high-end life. Share why this product would be valuable to others with similar interests. ABSOLUTELY NO HASHTAGS.'
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

async function reloadYoutubeContent() {
  try {
    const youtubeListPath = path.join(__dirname, 'youtubelist.json');
    if (!fs.existsSync(youtubeListPath)) return;
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
    }
    if (newContent.length !== youtubeContent.length) {
      youtubeContent = newContent;
      console.log(`[YouTube List] Reloaded: ${youtubeContent.length} videos loaded`);
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
  return '';
}

// Function to get random YouTube content
function getRandomYoutubeContent() {
  if (youtubeContent.length === 0) {
    console.log('No YouTube content available');
    return null;
  }
  const selectionRange = Math.max(1, youtubeContent.length - 2);
  const randomIndex = Math.floor(Math.random() * selectionRange);
  const content = youtubeContent[randomIndex];
  youtubeContent.splice(randomIndex, 1);
  youtubeContent.push(content);
  return {
    content: `${content.description}\n\n${content.url}`,
    hashtags: '',
    isApi: false,
    isYoutube: true
  };
}

// Function to generate enhanced content using OpenAI with fallback
async function getGeneratedContent(randomUser, directionInstruction = null) {
  try {
    if (!openaiContentGenerator) {
      openaiContentGenerator = new OpenAIContentGenerator();
    }
    const usePersonality = randomUser.user_id >= 1000 && randomUser.user_id <= 9999;
    const result = await openaiContentGenerator.generateContent(randomUser.username, usePersonality, directionInstruction);
    if (result) {
      return {
        content: result.content,
        isApi: false,
        isPersonalityGenerated: result.isPersonalityGenerated,
        isOpenAIGenerated: result.isOpenAIGenerated,
        topic: result.topic || 'general'
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to generate content:', error);
    return null;
  }
}

let db;
let openaiContentGenerator = null;
let enhancedCommentManager = null;

// Function to check if required database tables exist
async function checkTablesExist() {
    try {
        const requiredTables = ['User', 'Post', 'Comment'];
        const res = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        const existingTables = res.rows.map(t => t.table_name);
        console.log('Existing tables in public schema:', existingTables);
        const allExist = requiredTables.every(t => existingTables.includes(t));
        if (!allExist) {
            console.log('Missing tables. Required:', requiredTables, 'Existing:', existingTables);
        }
        return allExist;
    } catch (err) {
        console.error('Error checking tables:', err);
        return false;
    }
}

async function waitForTables(maxRetries = 30, delay = 5000) {
    let retries = 0;
    while (retries < maxRetries) {
        if (await checkTablesExist()) return true;
        console.log(`Tables not ready yet. Retry ${retries+1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
    }
    return false;
}

async function createTestUsers() {
    try {
        const seedUsers = [
            'PixelForge88', 'NullVortex', 'EchoByte_7', 'CyberDriftX', 'BitPhantom',
            'QuantumSnaps', 'GlitchMancer', 'CryptoNova42', 'ZeroLagZed', 'OverSoul',
            'SunnyDays23', 'finger_clicks', 'CoffeeAddict99', 'BookWorm_Reader',
            'TravelBug2023', 'Dannyboy', 'MusicLover426', 'GreenThumb_88',
            'YogaFlow_22', 'MovieBuff101', 'seasideLife', 'Urban_Wanderer',
            'PomsAreBest', 'ArtOfShame', 'FitnessJourney', 'CuriousMind55',
            'SilverLining_', 'WanderlustSoul', 'johnyforlife', 'knee',
            'StarGazer78', 'SunsetChaser', 'weekendBaker', '__smoke__',
            'CoffeeFirst_', 'HikingTrails', 'OceanBreeze22', 'ArtisticSoul99',
            'object_Object', 'SkyWatcher_7', 'PlantParent25', 'pocket_lint',
            'jazzGuzzler', 'NatureLover69', 'pigeonfart', 'melissa_ton',
            'VelvetVixen', 'ScarletMuse', 'SatinSiren', 'BlissfulBabe',
            'helenbae', 'SilkyIvy', 'GlamourGaze', 'RubyDesire', 'MidnightDahlia',
            'CocoLuxe', 'SunkissedSasha', 'LoveeDovee', 'CherryTammy', 'BellaFever',
            'kittyplum', 'JadeAllure', 'OpalEnchant', 'SableMyst', 'DesiBliss',
            'VivaVera', 'GPT_cake'
        ];

        for (let i = 0; i < seedUsers.length; i++) {
            const username = seedUsers[i];
            const email = `${username.toLowerCase()}@icomly.com`;
            const password = '$2b$10$6KVlm8VfUJ.eSPrKBc3qWepNKbPdYc.TRFw0wLgdKnC8ckZGN5zY.';
            
            await db.query(
                `INSERT INTO "User" ("name", "email", "password", "role") 
                 VALUES ($1, $2, $3, 'free') 
                 ON CONFLICT ("email") DO NOTHING`,
                [username, email, password]
            );
        }
        console.log(`Seed users ensure-sync completed.`);
    } catch (err) {
        console.error('Error creating seed users:', err);
    }
}

async function seedPost() {
    try {
        if (!await checkTablesExist()) return;
        
        const userRes = await db.query('SELECT "id", "name" FROM "User" WHERE "email" LIKE \'%@icomly.com\' ORDER BY RANDOM() LIMIT 1');
        if (userRes.rows.length === 0) return;
        const selectedUser = { user_id: userRes.rows[0].id, username: userRes.rows[0].name };

        const nextPostType = getNextPostType();
        let contentResult = null;
        
        if (nextPostType === 'ai_post') {
            const aiPostType = getNextAiPostType();
            const directionInstruction = getDirectionInstruction(aiPostType);
            contentResult = await getGeneratedContent(selectedUser, directionInstruction);
        } else if (nextPostType === 'affiliate_ai_post') {
            contentResult = await getGeneratedAffiliateContent(selectedUser.username);
        }

        if (contentResult && contentResult.content) {
            await db.query(
                'INSERT INTO "Post" ("user_id", "content", "created_at", "updated_at") VALUES ($1, $2, NOW(), NOW())',
                [selectedUser.user_id, contentResult.content]
            );
            console.log(`Created post for ${selectedUser.username}`);
        }
    } catch (err) {
        console.error('Error in seedPost:', err);
    }
}

async function getGeneratedAffiliateContent(username) {
    const products = [
        { text: 'Premium Noise Cancelling Headphones', link: 'https://amzn.to/example1', category: 'tech' },
        { text: 'Organic Skincare Set', link: 'https://amzn.to/example2', category: 'beauty' }
    ];
    const product = products[Math.floor(Math.random() * products.length)];
    if (!openaiContentGenerator) openaiContentGenerator = new OpenAIContentGenerator();
    const result = await openaiContentGenerator.generateAffiliateContent(username, product.text, product.link, product.category);
    return result;
}

function startSeedingInterval() {
    // Seed every 15-30 minutes
    const interval = Math.floor(Math.random() * (30 - 15 + 1) + 15) * 60 * 1000;
    setTimeout(async () => {
        await seedPost();
        startSeedingInterval();
    }, interval);
}

const PORT = process.env.PORT || 5050;

(async () => {
    try {
        db = new Pool({
            host: process.env.DB_HOST || 'postgres',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'user',
            password: process.env.DB_PASSWORD || 'password',
            database: process.env.DB_NAME || 'icomly'
        });

        console.log('Connecting to PostgreSQL...');
        await db.query('SELECT NOW()');
        console.log('Connected to PostgreSQL.');
        
        app.listen(PORT, () => {
            console.log(`Seeding service is running on port ${PORT}`);
            waitForTables().then(async ready => {
                if (ready) {
                    await createTestUsers();
                    openaiContentGenerator = new OpenAIContentGenerator();
                    try {
                        enhancedCommentManager = new EnhancedCommentManager(db);
                        enhancedCommentManager.startPeriodicCommentGeneration(15);
                    } catch (e) {
                        console.error('Enhanced comment manager failed:', e.message);
                    }
                    startSeedingInterval();
                    seedPost();
                }
            });
        });
    } catch (err) {
        console.error('Failed to start seed service:', err);
        process.exit(1);
    }
})();

import { Queue, Worker, Job } from 'bullmq';
import { geminiOptimizedService } from '../services/gemini-optimized.service';
import prisma from '../config/prisma';
import redisClient from '../config/redis';
import axios from 'axios';

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const feedQueue = new Queue('feed-generation', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
    }
});

// --- DATA SEED (With Coordinates) ---
const SEED_CELEBS = [
    // USA
    { name: "Taylor Swift", country: "USA", region: "North America", city: "New York", lat: 40.7128, lng: -74.0060, cat: "Musician" },
    { name: "Kim Kardashian", country: "USA", region: "North America", city: "Los Angeles", lat: 34.0522, lng: -118.2437, cat: "Influencer" },
    { name: "Dwayne Johnson", country: "USA", region: "North America", city: "Miami", lat: 25.7617, lng: -80.1918, cat: "Actor" },

    // UK
    { name: "Harry Styles", country: "UK", region: "Europe", city: "London", lat: 51.5074, lng: -0.1278, cat: "Musician" },
    { name: "Adele", country: "UK", region: "Europe", city: "London", lat: 51.5074, lng: -0.1278, cat: "Musician" },
    { name: "David Beckham", country: "UK", region: "Europe", city: "London", lat: 51.5074, lng: -0.1278, cat: "Athlete" },

    // Australia
    { name: "Chris Hemsworth", country: "Australia", region: "Oceania", city: "Sydney", lat: -33.8688, lng: 151.2093, cat: "Actor" },
    { name: "Margot Robbie", country: "Australia", region: "Oceania", city: "Gold Coast", lat: -28.0167, lng: 153.4000, cat: "Actor" },

    // Japan
    { name: "Shohei Ohtani", country: "Japan", region: "Asia", city: "Tokyo", lat: 35.6762, lng: 139.6503, cat: "Athlete" },
    { name: "Naomi Osaka", country: "Japan", region: "Asia", city: "Osaka", lat: 34.6937, lng: 135.5023, cat: "Athlete" },

    // South Korea
    { name: "Lisa Manobal", country: "South Korea", region: "Asia", city: "Seoul", lat: 37.5665, lng: 126.9780, cat: "Musician" },
    { name: "V (Taehyung)", country: "South Korea", region: "Asia", city: "Seoul", lat: 37.5665, lng: 126.9780, cat: "Musician" },

    // China
    { name: "Fan Bingbing", country: "China", region: "Asia", city: "Beijing", lat: 39.9042, lng: 116.4074, cat: "Actor" },
    { name: "Jackson Wang", country: "China", region: "Asia", city: "Shanghai", lat: 31.2304, lng: 121.4737, cat: "Musician" },

    // Russia
    { name: "Alla Pugacheva", country: "Russia", region: "Europe", city: "Moscow", lat: 55.7558, lng: 37.6173, cat: "Musician" },
    { name: "Khabib Nurmagomedov", country: "Russia", region: "Europe", city: "Makhachkala", lat: 42.9831, lng: 47.5046, cat: "Athlete" },

    // Ukraine
    { name: "Oleksandr Usyk", country: "Ukraine", region: "Europe", city: "Kyiv", lat: 50.4501, lng: 30.5234, cat: "Athlete" },
    { name: "Tina Karol", country: "Ukraine", region: "Europe", city: "Kyiv", lat: 50.4501, lng: 30.5234, cat: "Musician" },

    // Spain
    { name: "Rosalía", country: "Spain", region: "Europe", city: "Barcelona", lat: 41.3851, lng: 2.1734, cat: "Musician" },
    { name: "Rafael Nadal", country: "Spain", region: "Europe", city: "Manacor", lat: 39.5696, lng: 3.2096, cat: "Athlete" },

    // France
    { name: "Kylian Mbappé", country: "France", region: "Europe", city: "Paris", lat: 48.8566, lng: 2.3522, cat: "Athlete" },
    { name: "Marion Cotillard", country: "France", region: "Europe", city: "Paris", lat: 48.8566, lng: 2.3522, cat: "Actor" },

    // Germany
    { name: "Heidi Klum", country: "Germany", region: "Europe", city: "Berlin", lat: 52.5200, lng: 13.4050, cat: "Influencer" },
    { name: "Manuel Neuer", country: "Germany", region: "Europe", city: "Munich", lat: 48.1351, lng: 11.5820, cat: "Athlete" },

    // India
    { name: "Shah Rukh Khan", country: "India", region: "Asia", city: "Mumbai", lat: 19.0760, lng: 72.8777, cat: "Actor" },
    { name: "Priyanka Chopra", country: "India", region: "Asia", city: "Mumbai", lat: 19.0760, lng: 72.8777, cat: "Actor" },

    // Brazil
    { name: "Anitta", country: "Brazil", region: "South America", city: "Rio de Janeiro", lat: -22.9068, lng: -43.1729, cat: "Musician" },
    { name: "Neymar Jr", country: "Brazil", region: "South America", city: "Santos", lat: -23.9618, lng: -46.3322, cat: "Athlete" },

    // South Africa
    { name: "Trevor Noah", country: "South Africa", region: "Africa", city: "Johannesburg", lat: -26.2041, lng: 28.0473, cat: "Influencer" },
    { name: "Charlize Theron", country: "South Africa", region: "Africa", city: "Benoni", lat: -26.1929, lng: 28.3012, cat: "Actor" },

    // UAE
    { name: "Huda Kattan", country: "UAE", region: "Middle East", city: "Dubai", lat: 25.2048, lng: 55.2708, cat: "Influencer" }
];

// --- SEED COUNTRIES CONFIGURATION (for massive seeding job) ---
const SEED_COUNTRIES = [
    { name: 'USA', region: 'North America', city: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
    { name: 'UK', region: 'Europe', city: 'London', lat: 51.5074, lng: -0.1278 },
    { name: 'Canada', region: 'North America', city: 'Toronto', lat: 43.6532, lng: -79.3832 },
    { name: 'Australia', region: 'Oceania', city: 'Sydney', lat: -33.8688, lng: 151.2093 },
    { name: 'Japan', region: 'Asia', city: 'Tokyo', lat: 35.6762, lng: 139.6503 },
    { name: 'South Korea', region: 'Asia', city: 'Seoul', lat: 37.5665, lng: 126.9780 },
    { name: 'China', region: 'Asia', city: 'Beijing', lat: 39.9042, lng: 116.4074 },
    { name: 'India', region: 'Asia', city: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Germany', region: 'Europe', city: 'Berlin', lat: 52.5200, lng: 13.4050 },
    { name: 'France', region: 'Europe', city: 'Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'Spain', region: 'Europe', city: 'Madrid', lat: 40.4168, lng: -3.7038 },
    { name: 'Italy', region: 'Europe', city: 'Rome', lat: 41.9028, lng: 12.4964 },
    { name: 'Brazil', region: 'South America', city: 'São Paulo', lat: -23.5505, lng: -46.6333 },
    { name: 'Mexico', region: 'North America', city: 'Mexico City', lat: 19.4326, lng: -99.1332 },
    { name: 'Russia', region: 'Europe', city: 'Moscow', lat: 55.7558, lng: 37.6173 },
    { name: 'Ukraine', region: 'Europe', city: 'Kyiv', lat: 50.4501, lng: 30.5234 },
    { name: 'South Africa', region: 'Africa', city: 'Johannesburg', lat: -26.2041, lng: 28.0473 },
    { name: 'Nigeria', region: 'Africa', city: 'Lagos', lat: 6.5244, lng: 3.3792 },
    { name: 'UAE', region: 'Middle East', city: 'Dubai', lat: 25.2048, lng: 55.2708 },
    { name: 'Turkey', region: 'Europe', city: 'Istanbul', lat: 41.0082, lng: 28.9784 },
];

const SEED_CATEGORIES = ['Actor', 'Musician', 'Athlete', 'Influencer', 'TV Personality'];
const TARGET_PER_COUNTRY = 100;
const CELEBS_PER_BATCH = 25;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- HELPERS ---

const ALIAS_MAP: Record<string, string> = {
    "sean combs": "Diddy",
    "p diddy": "Diddy",
    "p. diddy": "Diddy",
    "sean diddy combs": "Diddy",
    "sean 'diddy' combs": "Diddy",
    "puff daddy": "Diddy",
    "ye": "Kanye West",
    "jlo": "Jennifer Lopez",
    "j-lo": "Jennifer Lopez",
    "the rock": "Dwayne Johnson"
};

const cleanCelebName = (rawName: string): string => {
    let name = rawName;
    const separators = [' and ', ' & ', ' with ', ' feat ', ' + ', ',', ' And ', ' AND '];
    for (const sep of separators) {
        if (name.includes(sep)) name = name.split(sep)[0];
    }
    name = name.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    return name.trim();
};

// Normalize person names by removing group/band suffixes to prevent duplicates
// e.g., "Jungkook (BTS)" -> "Jungkook", "V (Taehyung)" -> "V"
const normalizePersonName = (rawName: string): string => {
    if (!rawName || typeof rawName !== 'string') return '';
    let name = rawName;
    // Remove parenthetical suffixes like "(BTS)", "(BLACKPINK)", etc.
    name = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
    // Also strip common group suffixes not in parens
    name = name.replace(/\s+BTS$/i, '').trim();
    name = name.replace(/\s+BLACKPINK$/i, '').trim();
    name = name.replace(/\s+EXO$/i, '').trim();
    name = name.replace(/\s+TWICE$/i, '').trim();
    
    // Clean first
    name = cleanCelebName(name);

    // Check aliases
    const lower = name.toLowerCase().replace(/['"“”\.]/g, '').trim();
    if (ALIAS_MAP[lower]) return ALIAS_MAP[lower];
    
    // Fuzzy match for Diddy
    if (lower.includes('diddy') && (lower.includes('sean') || lower.includes('combs') || lower.includes('p '))) return "Diddy";

    return name;
};

const getAvatarName = (name: string): string => {
    return name.replace(/\([^)]*\)/g, '').trim();
};

const slugify = (text: string) => {
    // Use normalized name to prevent duplicates like "jungkook" vs "jungkook-bts"
    return normalizePersonName(text)
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

// Get current date string for AI prompts
const getCurrentDateString = (): string => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Extract key words from headline for better search targeting
const extractKeywords = (headline: string, celebName: string): string => {
    const stopWords = ['the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'with', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'about', 'after', 'before', 'new', 'just', 'breaking', 'celebrity', 'gossip', 'rumor'];
    const celebWords = celebName.toLowerCase().split(' ');

    return headline
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(' ')
        .filter(w => {
            const lowW = w.toLowerCase();
            return lowW.length > 3 &&
                !stopWords.includes(lowW) &&
                !celebWords.includes(lowW);
        })
        .slice(0, 3)
        .join(' ');
};

// Build a smart Google News search URL using celebrity name and category (NOT headline)
const buildSmartSearchUrl = (celebName: string, headline?: string, category?: string): string => {
    const sources = '(site:tmz.com OR site:people.com OR site:eonline.com OR site:etonline.com OR site:variety.com OR site:hollywoodreporter.com OR site:deadline.com)';
    // Use headline if available for better targeting
    const searchTerm = headline ? `"${headline.replace(/"/g, '')}"` : (category && category !== 'General' ? category.toLowerCase() : 'news');
    const query = `${celebName} ${searchTerm} ${sources}`.replace(/\s+/g, ' ').trim();
    return `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws`;
};

const isHomepageOrInvalid = (url: string | undefined | null): boolean => {
    if (!url) return true;
    try {
        const urlObj = new URL(url);
        // Check for root domain
        if (urlObj.pathname === '/' || urlObj.pathname === '') return true;
        // Specific check for etonline.com/news or similar generic landing pages if needed
        // For now, strictly invalidating root domains.
        return false;
    } catch {
        return true;
    }
};



const WIKI_MAPPING: Record<string, string> = {
    "V (Taehyung)": "V (singer)",
    "Lisa (BLACKPINK)": "Lisa (rapper)",
    "Lisa Manobal": "Lisa (rapper)",
    "G-Dragon": "G-Dragon",
    "Jennie (BLACKPINK)": "Jennie (singer)",
    "Jennie": "Jennie (singer)",
    "Rain": "Rain (entertainer)",
    "Anitta": "Anitta (singer)",
    "V": "V (singer)",
    "Yuzu": "Yuzuru Hanyu", // Usually refers to him in this context
    "Lira": "Lira (singer)",
    "Mantra": "Mantra (rapper)" // Assuming this is the intended one if it appears in feeds
};

const getWikipediaImage = async (celebName: string): Promise<string | null> => {
    const fetchImage = async (query: string) => {
        try {
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&format=json&pithumbsize=600&origin=*&redirects=1`;
            const res = await axios.get(searchUrl, { headers: { 'User-Agent': 'Icomly/1.0 (bot@icomly.com)' } });
            const pages = res.data.query?.pages;
            if (!pages) return null;
            const pageId = Object.keys(pages)[0];
            if (pageId === '-1') return null;
            return pages[pageId].thumbnail?.source || null;
        } catch { return null; }
    };

    // 1. Try mapped name first
    if (WIKI_MAPPING[celebName]) {
        const img = await fetchImage(WIKI_MAPPING[celebName]);
        if (img) return img;
    }

    // 2. Try direct name
    let img = await fetchImage(celebName);
    if (img) return img;

    const simpleName = getAvatarName(celebName);
    if (simpleName !== celebName) {
        return await fetchImage(simpleName);
    }
    return null;
};

// --- ARCHETYPE LOGIC ---

type Archetype = 'alister' | 'rising' | 'scandal' | 'stable';

const generateHistoryFromArchetype = (currentScore: number, trend: string, days = 7) => {
    const history = [];
    let simScore = currentScore;

    for (let i = 1; i <= days; i++) {
        let change = 0;

        // Reverse engineering stats: if trend is UP, previous scores were LOWER
        if (trend === 'up') {
            change = -1 * (Math.floor(Math.random() * 5) + 2); // -2 to -6
        } else if (trend === 'down') {
            change = (Math.floor(Math.random() * 5) + 2); // +2 to +6
        } else if (trend === 'volatile') {
            change = (Math.floor(Math.random() * 30) - 15); // Wild swings
        } else {
            change = (Math.floor(Math.random() * 6) - 3); // Stable noise
        }

        simScore = Math.max(10, Math.min(98, simScore + change));

        history.push({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            score: simScore
        });
    }
    return history;
};

// Fetch Wikipedia bio summary
const getWikipediaBio = async (celebName: string): Promise<string | null> => {
    try {
        const searchName = WIKI_MAPPING[celebName] || celebName;
        const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchName)}`;
        const res = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Icomly/1.0 (bot@icomly.com)' },
            validateStatus: (status) => status < 500
        });

        if (res.status === 404) return null;

        // Get the extract (summary) from Wikipedia
        const extract = res.data?.extract;
        if (extract && extract.length > 50) {
            return extract;
        }
        return null;
    } catch (e) {
        console.error(`[Wikipedia] Failed to fetch bio for ${celebName}:`, e);
        return null;
    }
};

// Check if a person is alive using Wikipedia
const isPersonAlive = async (celebName: string): Promise<boolean> => {
    try {
        const searchName = WIKI_MAPPING[celebName] || celebName;
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchName)}`;
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Icomly/1.0 (bot@icomly.com)' },
            validateStatus: (status) => status < 500
        });

        if (res.status === 404) return true; // No page = assume alive (will fail image check anyway)

        const extract = (res.data?.extract || '').toLowerCase();
        const description = (res.data?.description || '').toLowerCase();

        // Check for death indicators in the first sentence or description
        const deathIndicators = [' was a ', ' was an ', 'died ', 'deceased', ' death ', 'passed away', '(died', '– died'];
        for (const indicator of deathIndicators) {
            if (extract.includes(indicator) || description.includes(indicator)) {
                console.log(`[isPersonAlive] ${celebName} appears deceased (found: "${indicator}")`);
                return false;
            }
        }
        return true;
    } catch (e) {
        console.error(`[isPersonAlive] Check failed for ${celebName}:`, e);
        return true; // Assume alive on error
    }
};

// Check if an entity is a real person (not a band, group, or organization)
const isRealPerson = async (celebName: string): Promise<boolean> => {
    try {
        const searchName = WIKI_MAPPING[celebName] || celebName;
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchName)}`;
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Icomly/1.0 (bot@icomly.com)' },
            validateStatus: (status) => status < 500
        });

        if (res.status === 404) return false; // No page = unknown entity, reject

        const description = (res.data?.description || '').toLowerCase();

        // Reject if clearly a group/band/company
        const groupIndicators = [
            'boy band', 'girl group', 'band', 'musical group', 'duo',
            'rock band', 'pop group', 'hip hop group', 'k-pop group',
            'ensemble', 'orchestra', 'company', 'brand', 'organization',
            'south korean boy band', 'south korean girl group',
            'american rock band', 'british rock band', 'supergroup',
            'musical duo', 'vocal group', 'record label', 'entertainment company'
        ];

        for (const indicator of groupIndicators) {
            if (description.includes(indicator)) {
                console.log(`[isRealPerson] ${celebName} is a group/band: "${description}"`);
                return false;
            }
        }

        // Accept if clearly a person
        const personIndicators = [
            'singer', 'rapper', 'actor', 'actress', 'musician',
            'songwriter', 'composer', 'athlete', 'footballer',
            'basketball player', 'model', 'dancer', 'entertainer',
            'personality', 'influencer', 'businessperson', 'entrepreneur',
            'tennis player', 'boxer', 'mma fighter', 'golfer',
            'presenter', 'host', 'comedian', 'director', 'producer',
            'socialite', 'royal', 'prince', 'princess'
        ];

        for (const indicator of personIndicators) {
            if (description.includes(indicator)) {
                return true;
            }
        }

        // Reject if clearly a place/location (after person check to allow "Paris Hilton")
        const placeIndicators = [
            'city', 'town', 'village', 'borough', 'neighborhood',
            'district', 'country', 'continent', 'state', 'province',
            'island', 'lake', 'river', 'mountain', 'municipality',
            'capital', 'metropolis', 'territory', 'region'
        ];

        for (const indicator of placeIndicators) {
            if (description.includes(indicator)) {
                console.log(`[isRealPerson] ${celebName} is a place: "${description}"`);
                return false;
            }
        }

        // Default: assume person if not clearly a group or place
        return true;
    } catch (e) {
        console.error(`[isRealPerson] Check failed for ${celebName}:`, e);
        return true; // Assume person on error
    }
};

// --- JOBS ---

const seedCelebsJob = async () => {
    console.log('[SeedCelebs] creating profiles with metadata...');
    for (const celebData of SEED_CELEBS) {
        try {
            const cleanName = cleanCelebName(celebData.name);
            const slug = slugify(cleanName);
            const avatarName = getAvatarName(cleanName);
            const wikiImage = await getWikipediaImage(cleanName);

            await prisma.celebrity.upsert({
                where: { id: slug },
                update: {
                    country: celebData.country,
                    region: celebData.region,
                    primaryCity: celebData.city,
                    category: celebData.cat,
                    verified: true
                },
                create: {
                    id: slug,
                    name: cleanName,
                    bio: `${cleanName} is a global icon from ${celebData.country}.`,
                    imageUrl: wikiImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=random&color=fff&size=200`,
                    noiseRating: 50,
                    trendDirection: 'flat',
                    country: celebData.country,
                    region: celebData.region,
                    primaryCity: celebData.city,
                    category: celebData.cat,
                    verified: true
                }
            });

            // Seed Noise History for charts
            const historyCount = await prisma.noiseHistory.count({ where: { celebrityId: slug } });
            console.log(`[SeedCelebs] History count for ${cleanName}: ${historyCount}`);

            if (historyCount === 0) {
                const history = [];
                let currentScore = 50;
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);

                    // Random walk noise
                    const change = Math.floor(Math.random() * 20) - 10;
                    currentScore = Math.max(10, Math.min(95, currentScore + change));

                    history.push({
                        celebrityId: slug,
                        date: d,
                        score: currentScore
                    });
                }
                const created = await prisma.noiseHistory.createMany({ data: history });
                console.log(`[SeedCelebs] Seeded ${created.count} chart data points for ${cleanName}`);
            }

            await feedQueue.add('BackfillCeleb', { name: cleanName });
        } catch (error) {
            console.error(`[SeedCelebs] Failed for ${celebData.name}:`, error);
        }
    }
    console.log('[SeedCelebs] Profiles created. Background enrichment queued.');
};

const backfillCelebJob = async (name: string) => {
    console.log(`[BackfillCeleb] Starting for ${name}`);
    const cleanName = cleanCelebName(name);
    const slug = slugify(cleanName);
    const celeb = await prisma.celebrity.findUnique({
        where: { id: slug },
        include: { _count: { select: { articles: true } } }
    });

    if (!celeb) return;

    if (celeb._count.articles < 3) {
        const prompt = `
            TASK: Research REAL intelligence for ${cleanName} (${celeb.category || 'Celebrity'} from ${celeb.country || 'Global'}).
            CONTEXT: Today is ${getCurrentDateString()}.
            
            1. Find Three (3) REAL, RECENT gossip headlines or news stories (JSON array).
               - USE GOOGLE SEARCH.
               - MUST be from the last 7 days.
               - INCLUDE publishedAt date.
               - EACH summary MUST be a detailed paragraph (at least 3-4 sentences) providing deep context, specific details, and background. Do not be brief.
               - sourceUrl MUST be the DIRECT, PERMANENT link to the original news article. DO NOT use search results, temporary redirects (like vertexaisearch.cloud.google.com), or landing pages.
            2. One (1) current sighting report (JSON object) INCLUDING lat/lng coordinates.
               - Snippet MUST be a short, punchy sentence or two (e.g. "Spotted grabbing coffee in Soho, wearing an oversized hoodie.")
            3. Hobbies (comma-separated string).
            4. Relationship Status (SPECIFIC: If married/dating, MUST include partner name).
            5. Nationality (string).
            
            CRITICAL: Return ONLY a valid JSON object. NO preamble, NO markdown blocks, NO commentary.
            Ensure all double quotes INSIDE string values are properly escaped with a backslash (\\").
            
            Format: { 
                "articles": [{"headline": "text", "summary": "text", "source": "text", "sourceUrl": "text", "category": "text", "impactScore": 50, "publishedAt": "ISO Date"}], 
                "sighting": {"location": "text", "lat": 0.0, "lng": 0.0, "snippet": "text"},
                "hobbies": "surfing, coding",
                "relationshipStatus": "Married to [Partner Name] OR Dating [Partner Name] OR Single",
                "nationality": "American"
            }
        `;

        try {
            const data = await geminiOptimizedService.generateContent(prompt, { useSearch: true });

            // Update Celebrity Metadata
            const metaUpdate: any = {};
            if (data.hobbies) metaUpdate.hobbies = data.hobbies;
            if (data.relationshipStatus) metaUpdate.relationshipStatus = data.relationshipStatus;
            if (data.nationality) metaUpdate.nationality = data.nationality;

            if (Object.keys(metaUpdate).length > 0) {
                await prisma.celebrity.update({
                    where: { id: slug },
                    data: metaUpdate
                });
                console.log(`[BackfillCeleb] Updated metadata for ${cleanName}`);
            }

            // Create articles with smart search URLs
            if (data.articles && Array.isArray(data.articles)) {
                await prisma.article.createMany({
                    data: data.articles.map((a: any) => {
                        // Force date to NOW for "Breaking News" feel
                        let publishedAt = new Date();
                        publishedAt.setMinutes(publishedAt.getMinutes() - Math.floor(Math.random() * 120));

                        let sourceUrl = a.sourceUrl;
                        if (isHomepageOrInvalid(sourceUrl)) {
                            sourceUrl = buildSmartSearchUrl(cleanName, a.headline, a.category);
                        }

                        return {
                            headline: a.headline,
                            summary: a.summary,
                            source: a.source || "Entertainment News",
                            sourceUrl: sourceUrl,
                            publishedAt: publishedAt,
                            impactScore: a.impactScore || 50,
                            category: a.category || "General",
                            celebrityId: slug
                        };
                    })
                });
            }

            // 4. Sighting
            // 4. Sighting
            if (data.sighting) {
                // Use explicit lat/lng if available, else fallback to seed/random
                let lat = data.sighting.lat;
                let lng = data.sighting.lng;

                if (!lat || !lng) {
                    const seed = SEED_CELEBS.find(s => s.name === cleanName);
                    if (seed) { lat = seed.lat; lng = seed.lng; }
                }

                if (lat && lng) {
                    await prisma.sighting.create({
                        data: {
                            location: data.sighting.location || "Unknown Location",
                            lat: lat,
                            lng: lng,
                            confidence: 0.8,
                            date: new Date(),
                            snippet: data.sighting.snippet || `Spotted near ${data.sighting.location}`,
                            country: celeb.country,
                            region: celeb.region,
                            city: data.sighting.location ? data.sighting.location.split(',')[0].trim() : undefined,
                            celebrityId: slug,
                            verified: true
                        }
                    });
                    console.log(`[BackfillCeleb] Created sighting for ${cleanName} at ${lat}, ${lng}`);
                }
            }

            // 5. Trigger OSINT (Premium Data)
            const osintPrompt = `Research detailed OSINT data for ${cleanName}. 
            Focus on:
            1. Exact neighborhood/residence details (e.g. 'Beverly Park mansion', 'Tribeca Loft').
            2. Specific cars driven.
            3. Private habits or verified leaks.
            
            Return JSON: { 
                "reportedPhone": null, 
                "currentAddress": "Specific neighborhood/city", 
                "currentCar": "List of specific cars", 
                "frequentedPlaces": ["Spot 1", "Spot 2"], 
                "socialHandles": {}, 
                "additionalIntel": "Juicy details: pets, habits, security info (MUST be 3-4 sentences long)", 
                "dataQuality": 50 
            }`;
            const osintRes = await geminiOptimizedService.generateContent(osintPrompt);

            await prisma.celebrityOsint.upsert({
                where: { celebrityId: slug },
                update: {},
                create: {
                    celebrityId: slug,
                    reportedPhone: osintRes.reportedPhone,
                    currentAddress: osintRes.currentAddress,
                    currentCar: osintRes.currentCar,
                    frequentedPlaces: JSON.stringify(osintRes.frequentedPlaces),
                    socialHandles: JSON.stringify(osintRes.socialHandles),
                    additionalIntel: osintRes.additionalIntel,
                    dataQuality: osintRes.dataQuality || 50
                }
            });
            console.log(`[BackfillCeleb] Populated OSINT for ${cleanName}`);

        } catch (e) {
            console.error(`[BackfillCeleb] Failed for ${cleanName}:`, e);
        }
    }
};

const bioRefresher = async () => {
    // Find celebs that need bio updates (dull bios or missing structured fields)
    const celebs = await prisma.celebrity.findMany({
        where: {
            OR: [
                { bio: { contains: 'is a global icon' } },
                { lifeSummary: null },
                { bioLastUpdated: null },
                { bioLastUpdated: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
            ]
        },
        take: 10
    });

    console.log(`[BioRefresher] Found ${celebs.length} celebs needing bio updates.`);
    if (celebs.length === 0) return;

    // 1. Fetch Wikipedia bios first (FREE)
    const updateMap = new Map<string, any>();
    for (const c of celebs) {
        const wikiBio = await getWikipediaBio(c.name);
        if (wikiBio) {
            updateMap.set(c.id, {
                lifeSummary: wikiBio,
                bio: wikiBio.slice(0, 200) + (wikiBio.length > 200 ? '...' : ''),
                bioLastUpdated: new Date()
            });
            console.log(`[BioRefresher] Got Wikipedia bio for ${c.name}`);
        }
    }

    // 2. Batch Gemini calls for structured fields (hobbies, status, nationality)
    const prompts = celebs.map(c => `Research ${c.name} (${c.category || 'Celebrity'} from ${c.country || 'Unknown'}).
            Return ONLY verified, publicly known information. Return null for any field you cannot verify.
            Format as JSON:
            {
                "hobbies": "comma-separated list of known hobbies" or null,
                "relationshipStatus": "Exact status. If married/dating, MUST include partner name (e.g. 'Married to John Doe', 'Dating Jane Smith'). If single, say 'Single'." or null,
                "nationality": "primary nationality" or null
            }`);

    try {
        const batchResponses = await geminiOptimizedService.generateBatch(prompts);
        
        for (let i = 0; i < celebs.length; i++) {
            const c = celebs[i];
            const res = batchResponses[i];
            
            if (!res) continue;

            const updateData = updateMap.get(c.id) || { bioLastUpdated: new Date() };
            
            if (res.hobbies && res.hobbies !== 'null') {
                updateData.hobbies = res.hobbies;
            }
            if (res.relationshipStatus && res.relationshipStatus !== 'null') {
                updateData.relationshipStatus = res.relationshipStatus;
            }
            if (res.nationality && res.nationality !== 'null') {
                updateData.nationality = res.nationality;
            }

            await prisma.celebrity.update({
                where: { id: c.id },
                data: updateData
            });
            console.log(`[BioRefresher] Updated structured bio for ${c.name}`);
        }
    } catch (e) {
        console.error(`[BioRefresher] Batch Gemini failed:`, e);
        
        // Fallback: save whatever we got from Wikipedia
        for (const [id, data] of updateMap.entries()) {
            await prisma.celebrity.update({ where: { id }, data });
        }
    }
};

// Populate Quick Facts for ALL celebs on startup (one-time job)
const populateAllQuickFacts = async () => {
    // Find ALL celebs with missing quick facts (limited batch)
    const celebs = await prisma.celebrity.findMany({
        where: {
            OR: [
                { hobbies: null },
                { relationshipStatus: null },
                { nationality: null },
                { lifeSummary: null }
            ]
        },
        take: 10 // Cost optimization: Limit to 10 per run
    });

    console.log(`[PopulateQuickFacts] Found ${celebs.length} celebs needing quick facts.`);
    if (celebs.length === 0) return;

    // 1. Fetch Wikipedia bios first (FREE)
    const updateMap = new Map<string, any>();
    for (const c of celebs) {
        const wikiBio = await getWikipediaBio(c.name);
        if (wikiBio) {
            updateMap.set(c.id, {
                lifeSummary: wikiBio,
                bio: wikiBio.slice(0, 200) + (wikiBio.length > 200 ? '...' : ''),
                bioLastUpdated: new Date()
            });
            console.log(`[PopulateQuickFacts] Got Wikipedia bio for ${c.name}`);
        }
    }

    // 2. Batch Gemini calls for structured fields
    const prompts = celebs.map(c => `Research ${c.name} (${c.category || 'Celebrity'} from ${c.country || 'Unknown'}).
            Return ONLY verified, publicly known information. Return null for any field you cannot verify.
            Format as JSON:
            {
                "hobbies": "comma-separated list of known hobbies" or null,
                "relationshipStatus": "Exact status. If married/dating, MUST include partner name (e.g. 'Married to John Doe', 'Dating Jane Smith'). If single, say 'Single'." or null,
                "nationality": "primary nationality" or null
            }`);

    try {
        const batchResponses = await geminiOptimizedService.generateBatch(prompts);
        
        for (let i = 0; i < celebs.length; i++) {
            const c = celebs[i];
            const res = batchResponses[i];
            
            if (!res) continue;

            const updateData = updateMap.get(c.id) || { bioLastUpdated: new Date() };
            
            if (res.hobbies && res.hobbies !== 'null') {
                updateData.hobbies = res.hobbies;
            }
            if (res.relationshipStatus && res.relationshipStatus !== 'null') {
                updateData.relationshipStatus = res.relationshipStatus;
            }
            if (res.nationality && res.nationality !== 'null') {
                updateData.nationality = res.nationality;
            }

            await prisma.celebrity.update({
                where: { id: c.id },
                data: updateData
            });
            console.log(`[PopulateQuickFacts] Updated quick facts for ${c.name}`);
        }
    } catch (e) {
        console.error(`[PopulateQuickFacts] Batch Gemini failed:`, e);
        // Fallback: save whatever we got from Wikipedia
        for (const [id, data] of updateMap.entries()) {
            await prisma.celebrity.update({ where: { id }, data });
        }
    }

    console.log(`[PopulateQuickFacts] Completed processing ${celebs.length} celebs.`);
};

// OSINT Collector - gathers subscriber-only intelligence data
const osintCollector = async () => {
    // Get celebs that need OSINT updates (no data or stale data)
    const celebs = await prisma.celebrity.findMany({
        where: {
            OR: [
                { osintData: null },
                { osintData: { lastUpdated: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }
            ]
        },
        take: 5,
        include: { osintData: true }
    });

    console.log(`[OsintCollector] Found ${celebs.length} celebs needing OSINT updates.`);
    if (celebs.length === 0) return;

    const prompts = celebs.map(c => `Research detailed OSINT data for ${c.name} (${c.category || 'Celebrity'}).
            Return verified publicly available information from reliable sources (news, interviews, public records).
            
            Focus on getting SPECIFIC details:
            - Residence: Neighborhood, specific building, or area (e.g. 'Hidden Hills', 'Tribeca Loft').
            - Cars: Specific models if known (e.g. 'Matte Black G-Wagon').
            - Intel: Juicy but verified facts (habits, diet, pets, favorite spots).

            Format as JSON:
            {
                "reportedPhone": null (or verified public number),
                "currentAddress": "Specific neighborhood/city" or null,
                "currentCar": "known vehicles they drive" or null,
                "frequentedPlaces": ["restaurant1", "shop1", "gym1"] or null,
                "socialHandles": {"twitter": "@handle", "instagram": "@handle"} or null,
                "additionalIntel": "other verified interesting facts (MUST be a detailed paragraph of at least 3-4 sentences)" or null,
                "dataQuality": 0-100 confidence score
            }`);

    try {
        const batchResponses = await geminiOptimizedService.generateBatch(prompts);
        
        for (let i = 0; i < celebs.length; i++) {
            const c = celebs[i];
            const res = batchResponses[i];
            
            if (!res) continue;

            // Build update data, only including non-null fields
            const osintData: any = {
                lastUpdated: new Date(),
                dataQuality: res.dataQuality || 50
            };

            if (res.reportedPhone && res.reportedPhone !== 'null') {
                osintData.reportedPhone = res.reportedPhone;
            }
            if (res.currentAddress && res.currentAddress !== 'null') {
                osintData.currentAddress = res.currentAddress;
            }
            if (res.currentCar && res.currentCar !== 'null') {
                osintData.currentCar = res.currentCar;
            }
            if (res.frequentedPlaces && res.frequentedPlaces !== 'null') {
                osintData.frequentedPlaces = JSON.stringify(res.frequentedPlaces);
            }
            if (res.socialHandles && res.socialHandles !== 'null') {
                osintData.socialHandles = JSON.stringify(res.socialHandles);
            }
            if (res.additionalIntel && res.additionalIntel !== 'null') {
                osintData.additionalIntel = res.additionalIntel;
            }

            // Upsert OSINT data
            await prisma.celebrityOsint.upsert({
                where: { celebrityId: c.id },
                update: osintData,
                create: {
                    celebrityId: c.id,
                    ...osintData
                }
            });

            console.log(`[OsintCollector] Updated OSINT for ${c.name} (quality: ${osintData.dataQuality}%)`);
        }
    } catch (e) {
        console.error(`[OsintCollector] Batch Gemini failed:`, e);
    }
};

const globalFeedGenerator = async () => {
    try {
        const topics = ["Romance", "Scandal", "Career", "Fashion", "Viral"];
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        // We are in a simulation where the year is 2026, but we want REAL news (which is likely 2024/2025).
        // We instruct Gemini to find the "latest" real news, then we will time-shift it.
        const currentYear = new Date().getFullYear(); 

        const prompt = `
TASK: Search for and retrieve 5 REAL, TRENDING celebrity news stories.
CONTEXT: Today is ${getCurrentDateString()}.
1. USE GOOGLE SEARCH to find actual breaking news from the LAST 24-48 HOURS.
2. FOCUS on Major Stars (A-List).
3. VERIFY the events are REAL and occurring NOW.
4. Each summary MUST be a detailed paragraph (at least 3-4 sentences) providing extensive detail, background context, and juicy specifics. Avoid brief 1-2 sentence summaries.
5. IMPORTANT: sourceUrl MUST be the DIRECT, PERMANENT link to the original news article. DO NOT use search results, temporary redirects (like vertexaisearch.cloud.google.com), or landing pages.

CRITICAL: Return ONLY a valid JSON object. NO preamble, NO markdown blocks, NO commentary.
Ensure all double quotes INSIDE string values are properly escaped with a backslash (\\").

Format: JSON object { "articles": [{ "headline": "text", "summary": "text", "source": "text", "sourceUrl": "text", "celebName": "FULL NAME", "buzzScore": 50, "trend": "up", "category": "text", "publishedAt": "ISO Date" }] }.`;

        const data = await geminiOptimizedService.generateContent(prompt, { useSearch: true });

        if (data.articles && Array.isArray(data.articles)) {
            for (const item of data.articles) {
                if (item.celebName.includes('[') || item.celebName.includes('CelebName')) {
                    console.log(`[GlobalFeed] Skipping invalid name: ${item.celebName}`);
                    continue;
                }

                // Check for valid publishedAt date
                let publishedDate = new Date();
                
                // FORCE DATE TO NOW (Simulation Mode with Real Data)
                publishedDate = new Date();
                publishedDate.setMinutes(publishedDate.getMinutes() - Math.floor(Math.random() * 120));

                // Normalize the name to prevent duplicates like "Jungkook" vs "Jungkook (BTS)"
                const normalizedName = normalizePersonName(item.celebName);
                const cleanName = cleanCelebName(normalizedName);
                const slug = slugify(cleanName);
                const avatarName = getAvatarName(cleanName);

                // STRICT: Only allow creation if we find a real image (no hallucinations)
                // Try fetching image first
                let img = await getWikipediaImage(cleanName);
                const existingCeleb = await prisma.celebrity.findUnique({ where: { id: slug } });

                // If celeb doesn't exist and we can't find a real image, skip it to prevent junk profiles
                if (!existingCeleb && !img) {
                    console.log(`[GlobalFeed] Skipping ${cleanName} - No Wikipedia image found.`);
                    continue;
                }

                // Check if person is alive (only for new celebs to save API calls)
                if (!existingCeleb) {
                    const alive = await isPersonAlive(cleanName);
                    if (!alive) {
                        console.log(`[GlobalFeed] Skipping ${cleanName} - Appears to be deceased.`);
                        continue;
                    }

                    // NEW: Check if entity is a real person (not a band/group)
                    const isPerson = await isRealPerson(cleanName);
                    if (!isPerson) {
                        console.log(`[GlobalFeed] Skipping ${cleanName} - Not a person (likely a band/group).`);
                        continue;
                    }
                }

                // If existing, fallback to current or ui-avatars if desperately needed (though we try to avoid it)
                if (!img) img = `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=random`;

                let score = item.buzzScore || 50;
                // Add variance to prevent flat numbers
                score += Math.floor(Math.random() * 5) - 2; 
                // Clamp score
                score = Math.max(10, Math.min(99, score));

                const trend = item.trend || 'stable';

                const wikiBio = await getWikipediaBio(cleanName);

                await prisma.$transaction(async (tx) => {

                    const c = await tx.celebrity.upsert({
                        where: { id: slug },
                        update: { noiseRating: score, lastUpdated: new Date() },
                        create: {
                            id: slug,
                            name: cleanName,
                            bio: wikiBio || `${cleanName} is a trending figure in ${item.category || 'culture'}.`,
                            imageUrl: img!,
                            noiseRating: score,
                            trendDirection: 'up',
                            lifeSummary: wikiBio // Save it if we got it
                        }
                    });

                    // Ensure NoiseHistory exists (Seed if new)
                    const historyCount = await tx.noiseHistory.count({ where: { celebrityId: slug } });
                    if (historyCount === 0) {
                        const historyPoints = generateHistoryFromArchetype(score, trend, 7);
                        // Map to Prisma structure
                        const historyData = historyPoints.map(p => ({
                            celebrityId: slug,
                            date: p.date,
                            score: p.score
                        }));
                        await tx.noiseHistory.createMany({ data: historyData });
                    }

                    // Check if this article already exists (by headline in last 24h OR any article for this celeb in last 10m)
                    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
                    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    
                    const existingArticle = await tx.article.findFirst({
                        where: {
                            OR: [
                                {
                                    celebrityId: c.id,
                                    headline: { equals: item.headline, mode: 'insensitive' },
                                    publishedAt: { gte: twentyFourHoursAgo }
                                },
                                {
                                    celebrityId: c.id,
                                    publishedAt: { gte: tenMinutesAgo }
                                }
                            ]
                        }
                    });

                    if (existingArticle) {
                        console.log(`[GlobalFeed] Skipping ${cleanName} - article already exists or too recent.`);
                        return; // Exit transaction early, skip this article
                    }

                    // Create article with smart search URL
                    // If sourceUrl is missing from Gemini or invalid (homepage), build it
                    let finalSourceUrl = item.sourceUrl;
                    if (isHomepageOrInvalid(finalSourceUrl)) {
                         finalSourceUrl = buildSmartSearchUrl(cleanName, item.headline, item.category);
                    }

                    await tx.article.create({
                        data: {
                            headline: item.headline,
                            summary: item.summary,
                            source: item.source || "Entertainment News",
                            sourceUrl: finalSourceUrl,
                            publishedAt: publishedDate,
                            impactScore: score,
                            category: item.category || "General",
                            celebrityId: c.id
                        }
                    });

                    // If new, queue backfill for metadata
                    if (!existingCeleb) {
                        await feedQueue.add('BackfillCeleb', { name: cleanName });
                    }
                });
            }
        }
    } catch (e) { console.error("Feed gen failed", e); }


    const timeWindow = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const rawFeed = await prisma.article.findMany({
        where: { publishedAt: { gte: timeWindow } },
        take: 60,
        orderBy: { publishedAt: 'desc' },
        include: { celebrity: true }
    });

    // Post-processing: Prevent consecutive items for the same celebrity
    const feed: typeof rawFeed = [];
    const deferred: typeof rawFeed = [];

    for (const item of rawFeed) {
        if (feed.length > 0 && feed[feed.length - 1].celebrityId === item.celebrityId) {
            deferred.push(item);
        } else {
            feed.push(item);
        }
    }

    // Try to weave deferred items back in
    for (const item of deferred) {
        let inserted = false;
        for (let i = 1; i < feed.length; i++) {
            const prev = feed[i - 1];
            const next = feed[i];
            if (prev.celebrityId !== item.celebrityId && next.celebrityId !== item.celebrityId) {
                feed.splice(i, 0, item);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            feed.push(item);
        }
    }

    const finalFeed = feed.slice(0, 50).map(a => ({
        id: a.id,
        type: 'ARTICLE',
        headline: a.headline,
        summary: a.summary,
        source: a.source,
        sourceUrl: a.sourceUrl,
        publishedAt: a.publishedAt,
        impactScore: a.impactScore,
        category: a.category,
        celebrity: a.celebrity,
        timestamp: new Date(a.publishedAt).getTime()
    }));

    await redisClient.set('feed:global', JSON.stringify(finalFeed), { EX: 900 });
};

const regionalFeedGenerator = async (region: string) => {
    console.log(`[RegionalFeed] Starting for ${region}...`);
    try {
        // Get sample of celebs from this region
        const celebs = await prisma.celebrity.findMany({
            where: { 
                region: region,
                verified: true
            },
            take: 10,
            orderBy: { noiseRating: 'desc' } // Get top stars from region
        });

        if (celebs.length === 0) {
            console.log(`[RegionalFeed] No celebs found for ${region}`);
            return;
        }

        const celebNames = celebs.map(c => c.name).join(', ');

        const prompt = `
TASK: Search for REAL, REGIONAL celebrity news for: ${region}.
CONTEXT: Today is ${getCurrentDateString()}.
1. Focus on these stars if trending: ${celebNames}.
2. OR find other major breaking news from ${region}'s entertainment scene.
3. Must be REAL events from the LAST 48 HOURS.
4. Each summary MUST be a detailed paragraph (at least 3-4 sentences) providing extensive detail, regional context, and specifics. Avoid brief summaries.
5. IMPORTANT: sourceUrl MUST be the DIRECT, PERMANENT link to the original news article. DO NOT use search results, temporary redirects (like vertexaisearch.cloud.google.com), or landing pages.

CRITICAL: Return ONLY a valid JSON object. NO preamble, NO markdown blocks, NO commentary.
Ensure all double quotes INSIDE string values are properly escaped with a backslash (\\").

Format: JSON object { "articles": [{ "headline": "text", "summary": "text", "source": "text", "sourceUrl": "text", "celebName": "FULL NAME", "buzzScore": 50, "category": "text", "publishedAt": "ISO Date" }] }`;

        const data = await geminiOptimizedService.generateContent(prompt, { useSearch: true });

        if (data.articles && Array.isArray(data.articles)) {
            for (const item of data.articles) {
                 if (!item.celebName) continue;
                 
                // Same logic as Global Feed
                 // Normalize the name
                 const normalizedName = normalizePersonName(item.celebName);
                 const cleanName = cleanCelebName(normalizedName);
                 const slug = slugify(cleanName);
                 
                 // Reuse existing logic via DB transaction (simplified here for brevity, best to refactor common logic)
                 // For now, we'll just check existence and create article
                 
                 const existingCeleb = await prisma.celebrity.findUnique({ where: { id: slug } });
                 if (!existingCeleb) continue; // Only attach to existing celebs for regional feed to maintain quality

                 await prisma.article.create({
                     data: {
                         headline: item.headline,
                         summary: item.summary,
                         source: item.source || "Regional News",
                         sourceUrl: item.sourceUrl || "https://news.google.com",
                         publishedAt: new Date(),
                         impactScore: item.buzzScore || 50,
                         category: item.category || "General",
                         celebrityId: existingCeleb.id
                     }
                 });
                 console.log(`[RegionalFeed] Added article for ${cleanName}`);
            }
        }

    } catch (e) {
        console.error(`[RegionalFeed] Failed for ${region}:`, e);
    }
};

const profileRefresher = async () => {
    const BATCH_SIZE = 5;
    const TOTAL_TO_PROCESS = 5; // Cost optimization: Reduced from 25

    const celebs = await prisma.celebrity.findMany({
        where: {
            OR: [
                // Only pick celebs who have NOT had a sighting in the last 24 hours
                { sightings: { none: { date: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } } },
                { imageUrl: { contains: 'ui-avatars.com' } },
                { imageUrl: { endsWith: '.svg' } },
                { imageUrl: { endsWith: '.SVG' } }
            ]
        },
        take: TOTAL_TO_PROCESS,
        include: { osintData: true }
    });

    console.log(`[ProfileRefresher] Found ${celebs.length} celebs to refresh.`);

    // Process in batches to control concurrency
    for (let i = 0; i < celebs.length; i += BATCH_SIZE) {
        const batch = celebs.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (c) => {
            try {
                const isPlaceholder = c.imageUrl.includes('ui-avatars.com') || c.imageUrl.toLowerCase().endsWith('.svg');
                
                if (isPlaceholder) {
                    const clean = cleanCelebName(c.name);
                    const newImg = await getWikipediaImage(clean);
                    if (newImg && !newImg.toLowerCase().endsWith('.svg')) {
                        await prisma.celebrity.update({ where: { id: c.id }, data: { imageUrl: newImg } });
                        console.log(`[ProfileRefresher] Fixed image for ${c.name}: ${newImg}`);
                    }
                }

                // IMPROVED: Real-time Sighting Search
                const knownLocation = c.osintData?.currentAddress || c.primaryCity || c.country || "USA";
                const frequented = c.osintData?.frequentedPlaces ? `Known hangouts: ${c.osintData.frequentedPlaces}` : "";

                const prompt = `
Task: Find the REAL current location of ${c.name} (${c.category}).
Context: Today is ${getCurrentDateString()}.
1. USE GOOGLE SEARCH to find recent sightings, social media posts, or news from the LAST 3 DAYS.
2. If they are on tour, filming, or at an event, use that location.
3. If NO recent public data exists, fall back to their known residence/base: ${knownLocation}. ${frequented}
4. The snippet MUST be a short, punchy sentence or two (e.g. "Spotted grabbing coffee in Soho, wearing an oversized hoodie.")
   - If real news found: "Spotted at [Event]..."
   - If fallback used: "Seen near their home in [Location]..."

Format JSON: { "location": "City, Country", "lat": 0.0, "lng": 0.0, "snippet": "..." }
`;
                
                const res = await geminiOptimizedService.generateContent(prompt, { useSearch: true });

                // Fallback to seed data if available
                let lat = res.lat;
                let lng = res.lng;
                if (!lat || !lng) {
                    const seed = SEED_CELEBS.find(s => s.name === c.name);
                    if (seed) { lat = seed.lat; lng = seed.lng; }
                }

                if (lat && lng) {
                    await prisma.sighting.create({
                        data: {
                            location: res.location,
                            lat: lat,
                            lng: lng,
                            country: c.country,
                            region: c.region,
                            city: res.location.split(',')[0].trim(),
                            confidence: 0.7,
                            date: new Date(),
                            snippet: res.snippet,
                            celebrityId: c.id,
                            verified: true
                        }
                    });
                    console.log(`[ProfileRefresher] Created sighting for ${c.name}`);
                }
            } catch (e) { 
                console.error(`Refresher failed for ${c.name}`, e); 
            }
        }));
    }
    await redisClient.del('sightings:geo:v2');
};

const cleanupCrew = async () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    await prisma.article.deleteMany({ where: { publishedAt: { lt: d } } });
    await prisma.sighting.deleteMany({ where: { date: { lt: d } } });
};

// Cleanup deceased celebrities from the database
const cleanupDeceasedCelebs = async () => {
    console.log('[CleanupDeceased] Scanning for deceased celebrities...');

    // Get all non-seeded celebrities (those not in SEED_CELEBS)
    const seedSlugs = SEED_CELEBS.map(c => slugify(cleanCelebName(c.name)));
    const celebs = await prisma.celebrity.findMany({
        where: {
            id: { notIn: seedSlugs }
        },
        select: { id: true, name: true }
    });

    console.log(`[CleanupDeceased] Checking ${celebs.length} non-seeded celebrities...`);

    let removed = 0;
    for (const c of celebs) {
        const alive = await isPersonAlive(c.name);
        if (!alive) {
            console.log(`[CleanupDeceased] Removing deceased celebrity: ${c.name}`);
            // Delete in correct order due to foreign keys
            await prisma.celebrityOsint.deleteMany({ where: { celebrityId: c.id } });
            await prisma.article.deleteMany({ where: { celebrityId: c.id } });
            await prisma.sighting.deleteMany({ where: { celebrityId: c.id } });
            await prisma.noiseHistory.deleteMany({ where: { celebrityId: c.id } });
            await prisma.follow.deleteMany({ where: { celebrityId: c.id } });
            await prisma.celebrity.delete({ where: { id: c.id } });
            removed++;
        }
    }

    console.log(`[CleanupDeceased] Completed. Removed ${removed} deceased celebrities.`);

    // Clear caches
    await redisClient.del('feed:global');
    await redisClient.del('sightings:geo:v2');
    await redisClient.del('celebs:top');
};

// Generate celebrities using Gemini for a specific country and category
const generateCelebritiesForCountry = async (country: string, category: string, count: number): Promise<string[]> => {
    const prompt = `Generate a list of ${count} famous ${category}s from ${country} who are:
- Currently alive
- Real individual people (NOT bands, groups, or companies)
- Well-known celebrities with Wikipedia pages
- Active in the entertainment/sports industry

Return ONLY a JSON array of FULL NAMES (no nicknames unless official stage name), no other text:
["Name 1", "Name 2", "Name 3", ...]

Do NOT include:
- Bands or musical groups (e.g., BTS, BLACKPINK, The Beatles)
- Deceased individuals
- Fictional characters
- Non-celebrities`;

    try {
        const data = await geminiOptimizedService.generateContent(prompt);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error(`[MassiveSeed] Gemini failed for ${country} - ${category}:`, e);
        return [];
    }
};

// Process a single celebrity for the massive seed job
const processCelebrityForSeed = async (
    name: string,
    countryData: typeof SEED_COUNTRIES[0],
    category: string
): Promise<boolean> => {
    const normalizedName = normalizePersonName(name);
    const cleanName = cleanCelebName(normalizedName);
    const slug = slugify(cleanName);

    // Check if already exists in DB
    const existing = await prisma.celebrity.findUnique({ where: { id: slug } });
    if (existing) {
        return false; // Already exists, skip
    }

    // Validate with Wikipedia
    const isPerson = await isRealPerson(cleanName);
    if (!isPerson) {
        console.log(`    [Skip] ${cleanName} - Not a person`);
        return false;
    }

    const alive = await isPersonAlive(cleanName);
    if (!alive) {
        console.log(`    [Skip] ${cleanName} - Deceased`);
        return false;
    }

    const image = await getWikipediaImage(cleanName);
    if (!image) {
        console.log(`    [Skip] ${cleanName} - No Wikipedia image`);
        return false;
    }

    const bio = await getWikipediaBio(cleanName);

    // Create the celebrity
    try {
        await prisma.celebrity.create({
            data: {
                id: slug,
                name: cleanName,
                bio: bio?.slice(0, 200) || `${cleanName} is a ${category} from ${countryData.name}.`,
                lifeSummary: bio,
                imageUrl: image,
                noiseRating: 50 + Math.floor(Math.random() * 30),
                trendDirection: 'flat',
                country: countryData.name,
                region: countryData.region,
                primaryCity: countryData.city,
                category: category,
                verified: true
            }
        });

        // Seed initial noise history
        const history = [];
        let currentScore = 50;
        for (let i = 6; i >= 0; i--) {
            currentScore = Math.max(10, Math.min(95, currentScore + (Math.floor(Math.random() * 20) - 10)));
            history.push({
                celebrityId: slug,
                date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
                score: currentScore
            });
        }
        await prisma.noiseHistory.createMany({ data: history });

        // Trigger enrichment job
        await feedQueue.add('BackfillCeleb', { name: cleanName });

        console.log(`    [Added] ${cleanName}`);
        return true;
    } catch (e) {
        console.error(`    [Error] ${cleanName}:`, e);
        return false;
    }
};

// Massive seed job - generates 100 celebrities per country
const massiveSeedJob = async () => {
    console.log('[MassiveSeed] Starting massive celebrity seeding...');

    const startCount = await prisma.celebrity.count();
    console.log(`[MassiveSeed] Current database count: ${startCount}`);

    // Skip if we already have enough celebrities
    if (startCount >= 1000) {
        console.log('[MassiveSeed] Database already has 1000+ celebrities, skipping seed.');
        return;
    }

    let totalAdded = 0;

    for (const country of SEED_COUNTRIES) {
        const countryCount = await prisma.celebrity.count({ where: { country: country.name } });
        const needed = Math.max(0, TARGET_PER_COUNTRY - countryCount);

        if (needed === 0) {
            console.log(`[MassiveSeed] ${country.name} already has ${countryCount} celebrities, skipping.`);
            continue;
        }

        console.log(`\n[MassiveSeed] ${country.name}: has ${countryCount}, needs ${needed} more`);

        let countryAdded = 0;

        for (const category of SEED_CATEGORIES) {
            if (countryAdded >= needed) break;

            console.log(`  [${category}] Generating celebrities...`);

            const names = await generateCelebritiesForCountry(country.name, category, CELEBS_PER_BATCH);
            console.log(`  [${category}] Got ${names.length} names from Gemini`);

            for (const name of names) {
                if (countryAdded >= needed) break;
                if (!name || typeof name !== 'string') continue;

                const added = await processCelebrityForSeed(name, country, category);
                if (added) {
                    countryAdded++;
                    totalAdded++;
                }

                // Small delay to avoid rate limiting
                await delay(150);
            }

            // Delay between categories
            await delay(1500);
        }

        console.log(`[MassiveSeed] ${country.name}: Added ${countryAdded} celebrities`);

        // Delay between countries
        await delay(2000);
    }

    const finalCount = await prisma.celebrity.count();
    console.log('\n[MassiveSeed] === COMPLETE ===');
    console.log(`[MassiveSeed] Started with: ${startCount}`);
    console.log(`[MassiveSeed] Added: ${totalAdded}`);
    console.log(`[MassiveSeed] Final count: ${finalCount}`);
};

// Weekly Digest Job - sends weekly email digest to users
const weeklyDigestJob = async () => {
    console.log('[WeeklyDigest] Starting weekly digest job...');

    try {
        // Get all users who have weekly digest enabled
        const users = await prisma.user.findMany({
            where: {
                following: { some: {} } // Only users who follow at least one celebrity
            },
            include: {
                following: {
                    include: {
                        celebrity: true
                    }
                }
            }
        });

        console.log(`[WeeklyDigest] Found ${users.length} users to process`);

        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        let sentCount = 0;

        for (const user of users) {
            try {
                // Check notification settings
                let settings = { weeklyDigest: true }; // Default
                try {
                    if (user.notificationSettings) {
                        settings = JSON.parse(user.notificationSettings);
                    }
                } catch { /* Use defaults */ }

                if (!settings.weeklyDigest) {
                    continue; // User opted out
                }

                // Get articles from followed celebrities in the past week
                const celebIds = user.following.map(f => f.celebrityId);
                const articles = await prisma.article.findMany({
                    where: {
                        celebrityId: { in: celebIds },
                        publishedAt: { gte: oneWeekAgo }
                    },
                    orderBy: { impactScore: 'desc' },
                    take: 10,
                    include: { celebrity: true }
                });

                if (articles.length === 0) {
                    continue; // No news for this user
                }

                // Format highlights
                const highlights = articles.map(a => ({
                    celebName: a.celebrity.name,
                    summary: a.headline
                }));

                // Send digest via SMTP service
                const mailServiceUrl = process.env.MAIL_SERVICE_URL || 'http://mail:3025/send-email';
                await axios.post(mailServiceUrl, {
                    type: 'weekly_digest',
                    recipient: user.email,
                    userName: user.name || 'Icomly Fan',
                    highlights
                });

                sentCount++;
                console.log(`[WeeklyDigest] Sent digest to ${user.email}`);
            } catch (e) {
                console.error(`[WeeklyDigest] Failed for ${user.email}:`, e);
            }
        }

        console.log(`[WeeklyDigest] Complete. Sent ${sentCount} digests.`);
    } catch (e) {
        console.error('[WeeklyDigest] Job failed:', e);
    }
};

// Normalize scores to ensure a good spread for the chart (100 -> 40 for top 10)
const normalizeScoresJob = async () => {
    console.log('[NormalizeScores] Starting score distribution...');
    const celebs = await prisma.celebrity.findMany({
        orderBy: { noiseRating: 'desc' },
        select: { id: true, noiseRating: true }
    });

    // Target distribution: Rank 1 = ~98, Rank 10 = ~42
    // Linear drop: (98 - 42) / 9 = ~6.2 points per rank
    
    const updates = [];
    for (let i = 0; i < celebs.length; i++) {
        let newScore;
        
        if (i < 10) {
            // Top 10: Spread from 99 down to 40
            // Formula: 99 - (i * 6) -> 99, 93, 87, 81, 75, 69, 63, 57, 51, 45
            // Add randomness +/- 2
            const base = 99 - (i * 6);
            const noise = Math.floor(Math.random() * 5) - 2;
            newScore = Math.max(40, Math.min(100, base + noise));
        } else if (i < 50) {
            // Ranks 11-50: Decay from 40 down to 20
            newScore = Math.max(20, 40 - Math.floor((i - 10) / 2));
        } else {
            // The rest: 10-20
            newScore = Math.floor(Math.random() * 11) + 10;
        }

        // Only update if significantly different (to save DB writes)
        if (Math.abs(celebs[i].noiseRating - newScore) > 2) {
            updates.push(prisma.celebrity.update({
                where: { id: celebs[i].id },
                data: { noiseRating: newScore }
            }));
        }
    }

    if (updates.length > 0) {
        // Process in batches
        const BATCH_SIZE = 50;
        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            await prisma.$transaction(updates.slice(i, i + BATCH_SIZE));
        }
        console.log(`[NormalizeScores] Updated ${updates.length} celebrity scores.`);
        
        // Clear cache
        await redisClient.del('celebs:top');
        await redisClient.del('feed:global');
    } else {
        console.log('[NormalizeScores] Scores are already well distributed.');
    }
};

const feedWorker = new Worker('feed-generation', async (job: Job) => {
    console.log(`[Worker] Processing job ${job.id}: ${job.name}`);
    if (job.name === 'SeedCelebs') await seedCelebsJob();
    else if (job.name === 'MassiveSeed') await massiveSeedJob();
    else if (job.name === 'BackfillCeleb') await backfillCelebJob(job.data.name);
    else if (job.name === 'GlobalFeedGenerator') await globalFeedGenerator();
    else if (job.name === 'ProfileRefresher') await profileRefresher();
    else if (job.name === 'BioRefresher') await bioRefresher();
    else if (job.name === 'OsintCollector') await osintCollector();
    else if (job.name === 'CleanupCrew') await cleanupCrew();
    else if (job.name === 'PopulateQuickFacts') await populateAllQuickFacts();
    else if (job.name === 'CleanupDeceased') await cleanupDeceasedCelebs();
    else if (job.name === 'WeeklyDigest') await weeklyDigestJob();
    else if (job.name === 'RegionalFeedGenerator') await regionalFeedGenerator(job.data.region);
    else if (job.name === 'NormalizeScores') await normalizeScoresJob();
}, {
    connection,
    concurrency: 1,
    limiter: { max: 10, duration: 60000 }
});

setTimeout(() => {
    feedQueue.add('SeedCelebs', {});
    // feedQueue.add('MassiveSeed', {}); // Run massive seed check on startup
    feedQueue.add('GlobalFeedGenerator', {});
    feedQueue.add('ProfileRefresher', {});
    // feedQueue.add('BioRefresher', {});
    feedQueue.add('OsintCollector', {});  // Run on startup
    // feedQueue.add('PopulateQuickFacts', {});  // Populate ALL quick facts on startup
    // feedQueue.add('CleanupDeceased', {});  // Remove deceased celebrities on startup
    feedQueue.add('NormalizeScores', {});  // Run immediately
    
    // Initial Regional Feeds
    feedQueue.add('RegionalFeedGenerator', { region: 'Asia' });
    feedQueue.add('RegionalFeedGenerator', { region: 'Europe' });
    feedQueue.add('RegionalFeedGenerator', { region: 'North America' });
    // console.log('[Worker] Startup jobs skipped for cost optimization.');
}, 5000);

feedQueue.add('GlobalFeedGenerator', {}, { repeat: { pattern: '*/15 * * * *' } });
feedQueue.add('ProfileRefresher', {}, { repeat: { pattern: '*/30 * * * *' } });
feedQueue.add('BioRefresher', {}, { repeat: { pattern: '0 */2 * * *' } });
feedQueue.add('OsintCollector', {}, { repeat: { pattern: '0 3 * * *' } });  // Daily at 3 AM
feedQueue.add('CleanupCrew', {}, { repeat: { pattern: '0 0 * * *' } });
feedQueue.add('WeeklyDigest', {}, { repeat: { pattern: '0 9 * * 0' } });  // Sundays at 9 AM
feedQueue.add('NormalizeScores', {}, { repeat: { pattern: '*/30 * * * *' } }); // Every 30 mins

// Regional Feeds Schedule (staggered)
feedQueue.add('RegionalFeedGenerator', { region: 'Asia' }, { repeat: { pattern: '0 * * * *' } }); // Hourly
feedQueue.add('RegionalFeedGenerator', { region: 'Europe' }, { repeat: { pattern: '20 * * * *' } }); // Offset by 20 mins
feedQueue.add('RegionalFeedGenerator', { region: 'North America' }, { repeat: { pattern: '40 * * * *' } }); // Offset by 40 mins
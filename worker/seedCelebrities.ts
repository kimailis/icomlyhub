import path from 'path';
import dotenv from 'dotenv';

// Load .env from current dir or parent dir (project root)
const envPath = path.resolve(__dirname, '.env');
const rootEnvPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: envPath });
if (!process.env.GEMINI_API_KEY) {
    console.log('API Key not found in backend/.env, checking root .env...');
    dotenv.config({ path: rootEnvPath });
}

if (!process.env.GEMINI_API_KEY) {
    console.error('FATAL: GEMINI_API_KEY not found in .env files');
    process.exit(1);
}

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

// Database setup
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Gemini setup
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// --- CONFIGURATION ---
const COUNTRIES = [
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

const CATEGORIES = ['Actor', 'Musician', 'Athlete', 'Influencer', 'TV Personality'];

const TARGET_PER_COUNTRY = 100;
const CELEBS_PER_BATCH = 25;

// --- HELPERS ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const normalizePersonName = (rawName: string): string => {
    let name = rawName;
    name = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
    name = name.replace(/\s+BTS$/i, '').trim();
    name = name.replace(/\s+BLACKPINK$/i, '').trim();
    name = name.replace(/\s+EXO$/i, '').trim();
    return name;
};

const slugify = (text: string) => {
    return normalizePersonName(text)
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

const cleanCelebName = (rawName: string): string => {
    let name = rawName;
    const separators = [' and ', ' & ', ' with ', ' feat ', ' + ', ','];
    for (const sep of separators) {
        if (name.includes(sep)) name = name.split(sep)[0];
    }
    name = name.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    return name.trim();
};

// Get Wikipedia image
const getWikipediaImage = async (celebName: string): Promise<string | null> => {
    try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(celebName)}&prop=pageimages&format=json&pithumbsize=600&origin=*&redirects=1`;
        const res = await axios.get(searchUrl, { headers: { 'User-Agent': 'Icomly/1.0 (bot@icomly.com)' } });
        const pages = res.data.query?.pages;
        if (!pages) return null;
        const pageId = Object.keys(pages)[0];
        if (pageId === '-1') return null;
        return pages[pageId].thumbnail?.source || null;
    } catch { return null; }
};

// Get Wikipedia bio
const getWikipediaBio = async (celebName: string): Promise<string | null> => {
    try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(celebName)}`;
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Icomly/1.0 (bot@icomly.com)' },
            validateStatus: (status) => status < 500
        });
        if (res.status === 404) return null;
        return res.data?.extract || null;
    } catch { return null; }
};

// Check if entity is a real person
const isRealPerson = async (celebName: string): Promise<boolean> => {
    try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(celebName)}`;
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Icomly/1.0 (bot@icomly.com)' },
            validateStatus: (status) => status < 500
        });

        if (res.status === 404) return false;

        const description = (res.data?.description || '').toLowerCase();

        const groupIndicators = [
            'boy band', 'girl group', 'band', 'musical group', 'duo',
            'rock band', 'pop group', 'hip hop group', 'k-pop group',
            'ensemble', 'orchestra', 'company', 'brand', 'organization',
            'south korean boy band', 'south korean girl group',
            'supergroup', 'musical duo', 'vocal group', 'record label',
            // Place indicators
            'city', 'borough', 'town', 'village', 'municipality',
            'census-designated place', 'country', 'state', 'province',
            'capital', 'metropolis', 'suburb', 'district', 'neighborhood'
        ];

        for (const indicator of groupIndicators) {
            if (description.includes(indicator)) {
                return false;
            }
        }

        return true;
    } catch { return false; }
};

// Check if person is alive
const isPersonAlive = async (celebName: string): Promise<boolean> => {
    try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(celebName)}`;
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Icomly/1.0 (bot@icomly.com)' },
            validateStatus: (status) => status < 500
        });

        if (res.status === 404) return true;

        const extract = (res.data?.extract || '').toLowerCase();
        const description = (res.data?.description || '').toLowerCase();

        const deathIndicators = [' was a ', ' was an ', 'died ', 'deceased', ' death ', 'passed away', '(died'];
        for (const indicator of deathIndicators) {
            if (extract.includes(indicator) || description.includes(indicator)) {
                return false;
            }
        }
        return true;
    } catch { return true; }
};

// Generate celebrities using Gemini
async function generateCelebrities(country: string, category: string, count: number): Promise<string[]> {
    const prompt = `Generate a list of ${count} famous ${category}s from ${country} who are:
- Currently alive
- Real individual people (NOT bands, groups, or companies)
- Well-known celebrities with Wikipedia pages
- Active in the entertainment/sports industry

Return ONLY a JSON array of names, no other text:
["Name 1", "Name 2", "Name 3", ...]

Do NOT include:
- Bands or musical groups (e.g., BTS, BLACKPINK, The Beatles)
- Deceased individuals
- Fictional characters
- Non-celebrities`;

    try {
        const result = await gemini.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = result.text;
        if (!text) return [];

        const names = JSON.parse(text);
        return Array.isArray(names) ? names : [];
    } catch (e) {
        console.error(`  [Gemini] Failed to generate for ${country} - ${category}:`, e);
        return [];
    }
}

// Process a single celebrity
async function processCelebrity(
    name: string,
    country: typeof COUNTRIES[0],
    category: string
): Promise<boolean> {
    const normalizedName = normalizePersonName(name);
    const cleanName = cleanCelebName(normalizedName);
    const slug = slugify(cleanName);

    // Check if already exists
    const existing = await prisma.celebrity.findUnique({ where: { id: slug } });
    if (existing) {
        return false; // Already exists
    }

    // Validate with Wikipedia
    const [isPerson, isAlive, image, bio] = await Promise.all([
        isRealPerson(cleanName),
        isPersonAlive(cleanName),
        getWikipediaImage(cleanName),
        getWikipediaBio(cleanName)
    ]);

    if (!isPerson) {
        console.log(`    [Skip] ${cleanName} - Not a person`);
        return false;
    }

    if (!isAlive) {
        console.log(`    [Skip] ${cleanName} - Deceased`);
        return false;
    }

    if (!image) {
        console.log(`    [Skip] ${cleanName} - No Wikipedia image`);
        return false;
    }

    // Create the celebrity
    try {
        await prisma.celebrity.create({
            data: {
                id: slug,
                name: cleanName,
                bio: bio?.slice(0, 200) || `${cleanName} is a ${category} from ${country.name}.`,
                lifeSummary: bio,
                imageUrl: image,
                noiseRating: 50 + Math.floor(Math.random() * 30),
                trendDirection: 'flat',
                country: country.name,
                region: country.region,
                primaryCity: country.city,
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

        console.log(`    [Added] ${cleanName}`);

        // Note: The standalone script doesn't have access to the BullMQ queue instance easily 
        // without initializing it. For now, we'll rely on the worker picking up changes 
        // or the user running the internal worker job. 
        // However, to be thorough, let's log that enrichment is pending.
        console.log(`    [Pending Enrichment] ${cleanName} needs backfill.`);

        return true;
    } catch (e) {
        console.error(`    [Error] ${cleanName}:`, e);
        return false;
    }
}

// Main seeding function
async function seedCelebrities() {
    console.log('=== CELEBRITY DATABASE SEEDER ===\n');
    console.log(`Target: ${TARGET_PER_COUNTRY} celebrities per country`);
    console.log(`Countries: ${COUNTRIES.length}`);
    console.log(`Categories: ${CATEGORIES.length}\n`);

    const startCount = await prisma.celebrity.count();
    console.log(`Starting count: ${startCount} celebrities\n`);

    let totalAdded = 0;

    for (const country of COUNTRIES) {
        const countryStart = await prisma.celebrity.count({ where: { country: country.name } });
        const needed = Math.max(0, TARGET_PER_COUNTRY - countryStart);

        if (needed === 0) {
            console.log(`[${country.name}] Already has ${countryStart} celebrities, skipping.`);
            continue;
        }

        console.log(`\n[${country.name}] Has ${countryStart}, needs ${needed} more celebrities`);

        let countryAdded = 0;
        const celebsPerCategory = Math.ceil(needed / CATEGORIES.length);

        for (const category of CATEGORIES) {
            if (countryAdded >= needed) break;

            console.log(`  [${category}] Generating ${CELEBS_PER_BATCH} celebrities...`);

            const names = await generateCelebrities(country.name, category, CELEBS_PER_BATCH);
            console.log(`  [${category}] Got ${names.length} names from Gemini`);

            for (const name of names) {
                if (countryAdded >= needed) break;

                const added = await processCelebrity(name, country, category);
                if (added) {
                    countryAdded++;
                    totalAdded++;
                }

                // Small delay to avoid rate limiting
                await delay(100);
            }

            // Delay between categories
            await delay(1000);
        }

        console.log(`[${country.name}] Added ${countryAdded} celebrities`);

        // Delay between countries
        await delay(2000);
    }

    // Generate additional global celebrities to reach 1000
    const currentTotal = await prisma.celebrity.count();
    const globalNeeded = Math.max(0, 1000 - currentTotal);

    if (globalNeeded > 0) {
        console.log(`\n=== GLOBAL TOP CELEBRITIES ===`);
        console.log(`Current total: ${currentTotal}, need ${globalNeeded} more for 1000\n`);

        for (const category of CATEGORIES) {
            if (totalAdded >= 1000) break;

            console.log(`[Global - ${category}] Generating top celebrities...`);

            const names = await generateCelebrities('worldwide', category, 50);
            console.log(`[Global - ${category}] Got ${names.length} names`);

            // Use USA as default location for global celebs
            const usaCountry = COUNTRIES.find(c => c.name === 'USA')!;

            for (const name of names) {
                const added = await processCelebrity(name, usaCountry, category);
                if (added) totalAdded++;
                await delay(100);
            }

            await delay(2000);
        }
    }

    // Summary
    const finalCount = await prisma.celebrity.count();
    console.log('\n=== SEEDING COMPLETE ===');
    console.log(`Started with: ${startCount}`);
    console.log(`Added: ${totalAdded}`);
    console.log(`Final count: ${finalCount}`);

    // Country breakdown
    console.log('\n=== COUNTRY BREAKDOWN ===');
    for (const country of COUNTRIES) {
        const count = await prisma.celebrity.count({ where: { country: country.name } });
        console.log(`${country.name}: ${count}`);
    }
}

// Run
seedCelebrities()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

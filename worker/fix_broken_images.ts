
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import axios from 'axios';

const connectionString = "postgresql://user:password@localhost:5432/icomly?schema=public";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const USER_AGENT = 'Icomly/1.0 (bot@icomly.com)';

// Helper to check if URL is valid (200 OK)
async function isUrlValid(url: string): Promise<boolean> {
    if (!url || !url.startsWith('http')) return false;
    try {
        await axios.head(url, { headers: { 'User-Agent': USER_AGENT }, timeout: 5000 });
        return true;
    } catch (e: any) {
        // console.error(`URL check failed for ${url}: ${e.message}`);
        return false;
    }
}

// Helper to fetch from Wikipedia
const getWikipediaImage = async (celebName: string): Promise<string | null> => {
    const fetchImage = async (query: string) => {
        try {
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&format=json&pithumbsize=600&origin=*&redirects=1`;
            const res = await axios.get(searchUrl, { headers: { 'User-Agent': USER_AGENT } });
            const pages = res.data.query?.pages;
            if (!pages) return null;
            const pageId = Object.keys(pages)[0];
            if (pageId === '-1') return null;
            return pages[pageId].thumbnail?.source || null;
        } catch (e: any) {
            return null;
        }
    };

    let img = await fetchImage(celebName);
    if (img) return img;
    
    const simpleName = celebName.replace(/\([^)]*\)/g, '').trim();
    if (simpleName !== celebName) {
        return await fetchImage(simpleName);
    }
    return null;
};

async function processCeleb(celeb: any) {
    let needsUpdate = false;
    let newImg = celeb.imageUrl;

    // 1. Check if current image is valid
    const valid = await isUrlValid(celeb.imageUrl);
    
    if (!valid) {
        // console.log(`Broken image for ${celeb.name}: ${celeb.imageUrl}`);
        
        // 2. Try Wikipedia
        newImg = await getWikipediaImage(celeb.name);
        
        if (newImg) {
            // Check if the NEW image is valid (sometimes Wiki returns broken links? Unlikely but possible)
             // But usually it's fresh.
             // console.log(`Found new Wiki image for ${celeb.name}: ${newImg}`);
        } else {
            // 3. Fallback to ui-avatars
            newImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(celeb.name)}&background=random&size=256`;
            // console.log(`Using fallback for ${celeb.name}: ${newImg}`);
        }
        needsUpdate = true;
    }

    if (needsUpdate && newImg !== celeb.imageUrl) {
        await prisma.celebrity.update({
            where: { id: celeb.id },
            data: { imageUrl: newImg, lastUpdated: new Date() }
        });
        console.log(`Updated ${celeb.name}`);
    }
}

async function main() {
    console.log("Fetching all celebrities...");
    const celebs = await prisma.celebrity.findMany({
        select: { id: true, name: true, imageUrl: true }
    });
    console.log(`Found ${celebs.length} celebrities.`);

    const CONCURRENCY = 10;
    const chunks = [];
    for (let i = 0; i < celebs.length; i += CONCURRENCY) {
        chunks.push(celebs.slice(i, i + CONCURRENCY));
    }

    console.log(`Processing in ${chunks.length} chunks...`);

    let processed = 0;
    let updated = 0;

    for (const chunk of chunks) {
        await Promise.all(chunk.map(async (c) => {
            try {
                await processCeleb(c);
            } catch (e) {
                console.error(`Error processing ${c.name}:`, e);
            }
        }));
        processed += chunk.length;
        if (processed % 100 === 0) console.log(`Processed ${processed}/${celebs.length}`);
    }
    console.log("Done.");
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());

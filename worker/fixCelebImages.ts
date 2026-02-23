import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import axios from 'axios';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
    "Yuzu": "Yuzuru Hanyu",
    "Lira": "Lira (singer)",
    "Mantra": "Mantra (rapper)"
};

const getAvatarName = (name: string): string => {
    return name.replace(/\([^)]*\)/g, '').trim();
};

const getWikipediaImage = async (celebName: string): Promise<string | null> => {
    const fetchImage = async (query: string) => {
        try {
            console.log(`Fetching image for query: ${query}`);
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&format=json&pithumbsize=600&origin=*&redirects=1`;
            const res = await axios.get(searchUrl, { headers: { 'User-Agent': 'Icomly/1.0 (bot@icomly.com)' } });
            const pages = res.data.query?.pages;
            if (!pages) return null;
            const pageId = Object.keys(pages)[0];
            if (pageId === '-1') return null;
            return pages[pageId].thumbnail?.source || null;
        } catch (e: any) {
            console.error(`Error fetching image for ${query}: ${e.message}`);
            return null;
        }
    };

    // 1. Try mapped name first
    if (WIKI_MAPPING[celebName]) {
        const img = await fetchImage(WIKI_MAPPING[celebName]);
        if (img) return img;
    }

    // 2. Try direct name
    let img = await fetchImage(celebName);
    if (img) return img;

    // 3. Try avatar name (stripped parens)
    const simpleName = getAvatarName(celebName);
    if (simpleName !== celebName) {
        return await fetchImage(simpleName);
    }
    return null;
};

async function main() {
    console.log('Fixing placeholder and bad images...');

    const celebs = await prisma.celebrity.findMany({
        where: {
            OR: [
                { imageUrl: { contains: 'ui-avatars.com' } },
                { imageUrl: { contains: '.svg' } },
                { imageUrl: { contains: '.SVG' } },
                { name: { in: ['Rain', 'V', 'Mantra', 'Lira', 'Yuzu', 'Anitta'] } }
            ]
        }
    });

    console.log(`Found ${celebs.length} celebs with potentially bad images.`);

    for (const c of celebs) {
        const newImg = await getWikipediaImage(c.name);

        if (newImg && !newImg.toLowerCase().includes('.svg')) {
            await prisma.celebrity.update({
                where: { id: c.id },
                data: {
                    imageUrl: newImg,
                    lastUpdated: new Date()
                }
            });
            console.log(`Updated image for ${c.name}: ${newImg}`);
        } else {
            console.log(`Could not find better image for ${c.name} (current: ${c.imageUrl})`);
        }
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());

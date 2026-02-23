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
    "Anitta": "Anitta (singer)",
    "Trevor Noah": "Trevor Noah"
};

const getAvatarName = (name: string): string => {
    return name.replace(/\([^)]*\)/g, '').trim();
};

const getWikipediaData = async (celebName: string): Promise<{ bio: string | null, image: string | null }> => {
    try {
        const searchName = WIKI_MAPPING[celebName] || celebName;
        const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchName)}`;

        console.log(`Fetching from Wikipedia: ${searchUrl}`);
        const res = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Icomly/1.0 (bot@icomly.com)' },
            validateStatus: (status) => status < 500
        });

        if (res.status === 404) return { bio: null, image: null };

        return {
            bio: res.data?.extract || null,
            image: res.data?.thumbnail?.source || null
        };
    } catch (e: any) {
        console.error(`Error fetching for ${celebName}: ${e.message}`);
        return { bio: null, image: null };
    }
};

async function main() {
    console.log('Fixing remaining broken profiles...');

    // Find profiles with bad bios OR bad images
    const celebs = await prisma.celebrity.findMany({
        where: {
            OR: [
                { bio: { lt: ' ' } }, // Empty/short logic handled in loop usually better for complex checks, but let's grab all likely candidates
                { bio: { contains: 'is a global icon' } },
                { bio: '' },
                { imageUrl: { contains: 'ui-avatars.com' } },
                { name: 'Jennie' } // Explicitly target the one we found
            ]
        }
    });

    console.log(`Found ${celebs.length} potential candidates.`);

    for (const c of celebs) {
        // Double check if needs update
        const needsBio = !c.bio || c.bio.length < 50 || c.bio.includes('is a global icon');
        const needsImage = !c.imageUrl || c.imageUrl.includes('ui-avatars.com');

        if (!needsBio && !needsImage) continue;

        console.log(`Updating ${c.name}...`);

        const data = await getWikipediaData(c.name);

        const updateData: any = { lastUpdated: new Date() };

        if (needsBio && data.bio) {
            updateData.bio = data.bio.slice(0, 200) + '...';
            updateData.lifeSummary = data.bio;
            updateData.bioLastUpdated = new Date();
            console.log(`- New Bio: ${updateData.bio.slice(0, 50)}...`);
        }

        if (needsImage && data.image) {
            updateData.imageUrl = data.image;
            console.log(`- New Image: ${data.image}`);
        }

        if (Object.keys(updateData).length > 1) { // 1 because lastUpdated is always there
            await prisma.celebrity.update({
                where: { id: c.id },
                data: updateData
            });
            console.log(`Saved updates for ${c.name}`);
        } else {
            console.log(`No verified data found for ${c.name}`);
        }
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());

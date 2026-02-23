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
    "Lisa Manobal": "Lisa (rapper)", // Handle both variations if present
    "G-Dragon": "G-Dragon", // Usually works, but good to ensure
    "Jennie (BLACKPINK)": "Jennie (singer)"
};

const getWikipediaBio = async (celebName: string): Promise<string | null> => {
    try {
        // Check mapping first
        const searchName = WIKI_MAPPING[celebName] || celebName;
        console.log(`Fetching bio for: ${celebName} (using query: ${searchName})`);

        const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchName)}`;
        const res = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Icomly/1.0 (bot@icomly.com)' },
            validateStatus: (status) => status < 500
        });

        if (res.status === 404) return null;

        const extract = res.data?.extract;
        if (extract && extract.length > 50) {
            return extract;
        }
        return null;
    } catch (e: any) {
        console.error(`[Wikipedia] Failed to fetch bio for ${celebName}:`, e.message);
        return null;
    }
};

async function main() {
    console.log('Fixing dull bios...');

    const dullCelebs = await prisma.celebrity.findMany({
        where: {
            OR: [
                { bio: { contains: 'is a global icon from' } },
                { bio: { contains: 'Bio for' } },
                { bio: { lt: 'The' } } // Short bios
            ]
        }
    });

    console.log(`Found ${dullCelebs.length} candidates for update.`);

    for (const c of dullCelebs) {
        const newBio = await getWikipediaBio(c.name);

        if (newBio) {
            await prisma.celebrity.update({
                where: { id: c.id },
                data: {
                    bio: newBio,
                    lifeSummary: newBio,
                    bioLastUpdated: new Date()
                }
            });
            console.log(`Updated bio for ${c.name}`);
        } else {
            console.log(`Could not find better bio for ${c.name}`);
        }
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('--- PROFILE HEALTH CHECK ---');

    const allCelebs = await prisma.celebrity.findMany();

    let badBios = 0;
    let badImages = 0;

    console.log(`Scanning ${allCelebs.length} profiles...\n`);

    for (const c of allCelebs) {
        const issues = [];

        // Check Bio
        if (!c.bio || c.bio.trim() === '' || c.bio.length < 50 || c.bio.includes('is a global icon from')) {
            issues.push(`Bad Bio (Length: ${c.bio?.length || 0})`);
            badBios++;
        }

        // Check Image
        if (!c.imageUrl || c.imageUrl.trim() === '' || c.imageUrl.includes('ui-avatars.com')) {
            issues.push(`Bad Image (${c.imageUrl || 'NULL'})`);
            badImages++;
        }

        if (issues.length > 0) {
            console.log(`[${c.name}] Issues: ${issues.join(', ')}`);
        }
    }

    console.log('\n--- SUMMARY ---');
    console.log(`Total Celebs: ${allCelebs.length}`);
    console.log(`Bad Bios: ${badBios}`);
    console.log(`Bad Images: ${badImages}`);
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('--- AUDITING PROFILES ---');
    const celebs = await prisma.celebrity.findMany({
        select: { id: true, name: true, bio: true, imageUrl: true }
    });

    let badBios = 0;
    let badImages = 0;

    for (const c of celebs) {
        const isDullBio = !c.bio || c.bio.length < 50 || c.bio.includes('is a global icon from');
        const isBadImage = !c.imageUrl || c.imageUrl.includes('ui-avatars.com') || c.imageUrl === '';

        if (isDullBio || isBadImage) {
            console.log(`[PROBLEM] ${c.name} (${c.id})`);
            if (isDullBio) console.log(`  - Bad Bio: ${c.bio?.substring(0, 50)}...`);
            if (isBadImage) console.log(`  - Bad Image: ${c.imageUrl}`);
            if (isDullBio) badBios++;
            if (isBadImage) badImages++;
        }
    }
    console.log(`\nFound ${badBios} bad bios and ${badImages} bad images out of ${celebs.length} total.`);
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());

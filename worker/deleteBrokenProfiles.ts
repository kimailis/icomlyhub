import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('--- DELETING BROKEN PROFILES ---');

    // Search for names containing brackets or "CelebName"
    const broken = await prisma.celebrity.findMany({
        where: {
            OR: [
                { name: { contains: '[CelebName]' } },
                { name: { contains: 'CelebName' } },
                { name: { contains: '[' } },
                { name: { contains: ']' } }
            ]
        }
    });

    console.log(`Found ${broken.length} broken profiles.`);

    if (broken.length > 0) {
        // Need to delete related records first (cascade should handle it usually, but let's be explicit if needed)
        // Prisma usually handles cascade delete if configured in schema. 
        // Assuming schema has cascade or we just try deleting the celeb.
        const ids = broken.map(b => b.id);

        // Delete related articles/sightings first just in case
        await prisma.article.deleteMany({ where: { celebrityId: { in: ids } } });
        await prisma.sighting.deleteMany({ where: { celebrityId: { in: ids } } });
        await prisma.noiseHistory.deleteMany({ where: { celebrityId: { in: ids } } });
        await prisma.celebrityOsint.deleteMany({ where: { celebrityId: { in: ids } } });

        const deleted = await prisma.celebrity.deleteMany({
            where: { id: { in: ids } }
        });
        console.log(`Deleted ${deleted.count} profiles.`);
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());

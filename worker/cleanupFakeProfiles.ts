import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('--- CLEANING UP FAKE PROFILES ---');

    // These names look like generic placeholders we want to nuke to keep the DB clean
    const badNames = [
        'Liam Hayes', 'David Lee', 'Gwyneth Monroe', 'Justin Breeze', 'Tiffany Blake'
    ];

    const targets = await prisma.celebrity.findMany({
        where: { name: { in: badNames } }
    });

    if (targets.length === 0) {
        console.log('No targets found.');
        return;
    }

    const ids = targets.map(t => t.id);
    console.log(`Deleting ${ids.length} profiles: ${ids.join(', ')}`);

    // Delete related data first
    await prisma.article.deleteMany({ where: { celebrityId: { in: ids } } });
    await prisma.sighting.deleteMany({ where: { celebrityId: { in: ids } } });
    await prisma.noiseHistory.deleteMany({ where: { celebrityId: { in: ids } } });
    await prisma.celebrityOsint.deleteMany({ where: { celebrityId: { in: ids } } });

    await prisma.celebrity.deleteMany({ where: { id: { in: ids } } });

    console.log('Cleanup complete.');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());

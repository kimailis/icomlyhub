import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('--- CHECKING FOR BROKEN PROFILES ---');

    // Search for names containing brackets or "CelebName"
    const broken = await prisma.celebrity.findMany({
        where: {
            OR: [
                { name: { contains: '[CelebName]' } },
                { name: { contains: 'CelebName' } }, // Just in case brackets were stripped
                { name: { contains: '[' } },
                { name: { contains: ']' } }
            ]
        }
    });

    console.log(`Found ${broken.length} broken profiles.`);
    broken.forEach(b => console.log(`- ${b.name} (${b.id})`));

    // Optional: Delete them?
    // Doing this in a separate step to be safe, but code is here if needed.
    // if (broken.length > 0) {
    //    console.log('Deleting...');
    //    await prisma.celebrity.deleteMany({
    //        where: { id: { in: broken.map(b => b.id) } }
    //    });
    // }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());

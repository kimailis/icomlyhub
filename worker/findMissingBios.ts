import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Checking for dull/placeholder bios...');

    const allCelebs = await prisma.celebrity.findMany({
        select: { id: true, name: true, bio: true }
    });

    const dullBios = allCelebs.filter(c =>
        c.bio.includes('is a global icon from') ||
        c.bio.includes('Bio for') ||
        c.bio.length < 50
    );

    console.log(`\nFound ${dullBios.length} dull/placeholder bios:`);
    dullBios.forEach(p => {
        console.log(`- ${p.name} (${p.id}): ${p.bio.substring(0, 50)}...`);
    });
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());


import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = "postgresql://user:password@localhost:5432/icomly?schema=public";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const count = await prisma.celebrity.count();
    console.log(`Total celebrities: ${count}`);
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());

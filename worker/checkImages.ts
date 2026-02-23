import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const celebs = await prisma.celebrity.findMany({
    select: { id: true, name: true, imageUrl: true }
  });

  console.log('--- CELEBRITY IMAGES ---');
  celebs.forEach(c => {
    console.log(`[${c.name}] ${c.imageUrl}`);
  });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());

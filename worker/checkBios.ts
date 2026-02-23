import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const celebs = await prisma.celebrity.findMany({
    take: 5,
    select: { name: true, bio: true }
  });

  console.log('--- CELEBRITY BIOS ---');
  celebs.forEach(c => {
      console.log(`[${c.name}]: ${c.bio.substring(0, 100)}...`);
  });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());

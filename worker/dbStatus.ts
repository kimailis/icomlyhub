import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const celebCount = await prisma.celebrity.count();
  const articleCount = await prisma.article.count();
  const sightingCount = await prisma.sighting.count();
  const noiseHistoryCount = await prisma.noiseHistory.count();
  const userCount = await prisma.user.count();

  const latestArticles = await prisma.article.findMany({
    take: 5,
    orderBy: { publishedAt: 'desc' },
    select: { headline: true, celebrityId: true }
  });

  const latestSightings = await prisma.sighting.findMany({
    take: 5,
    orderBy: { date: 'desc' },
    select: { location: true, celebrityId: true }
  });

  console.log('--- DATABASE STATUS ---');
  console.log(`Celebrities:   ${celebCount}`);
  console.log(`Articles:      ${articleCount}`);
  console.log(`Sightings:     ${sightingCount}`);
  console.log(`Noise History: ${noiseHistoryCount}`);
  console.log(`Users:         ${userCount}`);
  console.log('\n--- LATEST ARTICLES ---');
  latestArticles.forEach(a => console.log(`- [${a.celebrityId}] ${a.headline}`));
  console.log('\n--- LATEST SIGHTINGS ---');
  latestSightings.forEach(s => console.log(`- [${s.celebrityId}] ${s.location}`));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());

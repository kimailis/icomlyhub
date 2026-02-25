const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanupDuplicates() {
  console.log('Starting cleanup of duplicate articles...');
  
  const allArticles = await prisma.article.findMany({
    orderBy: { publishedAt: 'desc' },
  });

  const seenCelebsIn24h = new Map(); // celebId -> lastPublishedAt
  const seenHeadlines = new Set();
  const toDelete = [];

  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  for (const article of allArticles) {
    const headline = article.headline.toLowerCase().trim();
    const celebId = article.celebrityId;
    const pubTime = article.publishedAt.getTime();

    // Check for exact duplicate headlines
    if (seenHeadlines.has(headline)) {
      toDelete.push(article.id);
      continue;
    }

    // Check for same celeb within 24h
    if (seenCelebsIn24h.has(celebId)) {
      const lastTime = seenCelebsIn24h.get(celebId);
      if (Math.abs(lastTime - pubTime) < TWENTY_FOUR_HOURS) {
        // Keep the one that's already in the Map (it's newer because of desc order)
        toDelete.push(article.id);
        continue;
      }
    }

    seenHeadlines.add(headline);
    seenCelebsIn24h.set(celebId, pubTime);
  }

  console.log(`Found ${toDelete.length} duplicate articles to delete.`);

  if (toDelete.length > 0) {
    // Delete in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = toDelete.slice(i, i + BATCH_SIZE);
      await prisma.article.deleteMany({
        where: { id: { in: batch } }
      });
      console.log(`Deleted batch ${Math.floor(i/BATCH_SIZE) + 1}`);
    }
  }

  console.log('Cleanup complete.');
}

cleanupDuplicates()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

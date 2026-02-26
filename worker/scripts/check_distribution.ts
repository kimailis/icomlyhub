import prisma from '../src/config/prisma';

async function main() {
  const topCelebs = await prisma.celebrity.findMany({
    take: 20,
    orderBy: { noiseRating: 'desc' },
    select: { name: true, country: true, region: true, noiseRating: true }
  });
  console.log('--- TOP 20 CELEBRITIES BY NOISE RATING ---');
  topCelebs.forEach((c, i) => console.log(`${i+1}. [${c.country}] ${c.name}: ${c.noiseRating}`));

  const regionCounts = await prisma.celebrity.groupBy({
    by: ['region'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });
  console.log('\n--- CELEBRITIES BY REGION ---');
  regionCounts.forEach(r => console.log(`${r.region}: ${r._count.id}`));
  
  const articleCounts = await prisma.article.findMany({
    take: 10,
    orderBy: { publishedAt: 'desc' },
    include: { celebrity: true }
  });
  console.log('\n--- LATEST 10 ARTICLES ---');
  articleCounts.forEach(a => console.log(`- [${a.celebrity?.country}] ${a.celebrity?.name}: ${a.headline}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

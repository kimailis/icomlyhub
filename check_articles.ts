import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkArticles() {
  const articles = await prisma.article.findMany({
    take: 10,
    orderBy: { publishedAt: 'desc' },
    select: { headline: true, source: true, sourceUrl: true }
  });
  console.log(JSON.stringify(articles, null, 2));
  await prisma.$disconnect();
}

checkArticles();

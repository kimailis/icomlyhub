const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const articles = await prisma.article.findMany({
    where: { headline: { contains: 'Trevor Noah' } },
    orderBy: { publishedAt: 'desc' },
    take: 10,
    include: { celebrity: { select: { name: true } } }
  });
  console.log(JSON.stringify(articles, null, 2));
  await prisma.$disconnect();
}
run().catch(console.error);

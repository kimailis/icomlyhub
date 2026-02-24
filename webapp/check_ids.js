const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const articles = await prisma.article.findMany({
    include: { celebrity: true },
    take: 10
  });
  
  console.log("ARTICLES CHECK:");
  articles.forEach(a => {
    console.log(`Headline: ${a.headline}`);
    console.log(`Celebrity ID from Article: ${a.celebrityId}`);
    console.log(`Celebrity Name: ${a.celebrity ? a.celebrity.name : 'NULL'}`);
    console.log(`Celebrity ID from relation: ${a.celebrity ? a.celebrity.id : 'NULL'}`);
    console.log('---');
  });

  const celebs = await prisma.celebrity.findMany({
    take: 5
  });
  console.log("CELEBS CHECK:");
  celebs.forEach(c => {
    console.log(`Celeb Name: ${c.name}, ID: ${c.id}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

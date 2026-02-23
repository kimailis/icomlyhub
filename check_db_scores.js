
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const celebs = await prisma.celebrity.findMany({
    take: 20,
    orderBy: { noiseRating: 'desc' },
    select: { name: true, noiseRating: true }
  });
  console.log(celebs);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

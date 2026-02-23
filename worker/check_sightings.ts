import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const sightings = await prisma.sighting.findMany({
        orderBy: { date: 'desc' },
        take: 5,
        include: { celebrity: { select: { name: true } } }
    });
    console.log(JSON.stringify(sightings, null, 2));
}
main().catch(console.error).finally(async () => await prisma.$disconnect());

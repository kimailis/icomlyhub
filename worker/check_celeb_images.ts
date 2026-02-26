import prisma from './src/config/prisma';

async function check() {
    const total = await prisma.celebrity.count();
    const local = await prisma.celebrity.count({
        where: { imageUrl: { startsWith: '/uploads/' } }
    });
    const remote = await prisma.celebrity.count({
        where: { imageUrl: { startsWith: 'http' } }
    });
    const placeholders = await prisma.celebrity.count({
        where: { imageUrl: { contains: 'ui-avatars.com' } }
    });
    
    console.log(`Total: ${total}`);
    console.log(`Local: ${local}`);
    console.log(`Remote: ${remote}`);
    console.log(`Placeholders: ${placeholders}`);
    
    const sample = await prisma.celebrity.findMany({
        take: 5,
        select: { name: true, imageUrl: true }
    });
    console.log('Sample:', JSON.stringify(sample, null, 2));
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

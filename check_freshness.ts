import prisma from './webapp/lib/prisma';

async function main() {
    const latestArticle = await prisma.article.findFirst({
        orderBy: { publishedAt: 'desc' },
        select: { publishedAt: true, headline: true }
    });
    const latestScoop = await prisma.post.findFirst({
        where: { verified: true, isFeedCandidate: true },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, content: true }
    });

    console.log('LATEST ARTICLE:', latestArticle);
    console.log('LATEST SCOOP:', latestScoop);
    console.log('CURRENT TIME:', new Date().toISOString());
}

main().catch(console.error).finally(() => prisma.$disconnect());

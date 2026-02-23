
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching latest articles from database...');
    const articles = await prisma.article.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 10,
        include: { celebrity: { select: { name: true } } }
    });

    if (articles.length === 0) {
        console.log('No articles found in database.');
        return;
    }

    articles.forEach(a => {
        console.log(`[${a.publishedAt.toISOString()}] ${a.celebrity?.name}: ${a.headline}`);
        console.log(`   Source: ${a.source} (${a.sourceUrl})`);
        console.log('---');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

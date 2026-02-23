
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Fetching celebs...');
    const celebs = await prisma.celebrity.findMany({
        orderBy: { noiseRating: 'desc' },
        select: { id: true, name: true, noiseRating: true }
    });

    console.log(`Found ${celebs.length} celebs.`);

    const updates = [];
    for (let i = 0; i < celebs.length; i++) {
        let newScore;
        
        if (i < 10) {
            // Top 10: Spread from 99 down to 45
            // i=0 -> 99
            // i=9 -> 45
            // drop per step = (99-45)/9 = 6
            const base = 99 - (i * 6);
            const noise = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
            newScore = Math.max(40, Math.min(100, base + noise));
        } else if (i < 50) {
            // Ranks 11-50: Decay from 45 down to 20
            // i=10 -> 44
            // i=49 -> 20
            // drop = 24 / 40 = 0.6 per step
            newScore = Math.floor(45 - ((i - 10) * 0.6));
            newScore = Math.max(20, newScore);
        } else {
            // The rest: 10-20
            newScore = Math.floor(Math.random() * 11) + 10;
        }

        if (celebs[i].noiseRating !== newScore) {
            updates.push(prisma.celebrity.update({
                where: { id: celebs[i].id },
                data: { noiseRating: newScore }
            }));
        }
    }

    console.log(`Updating ${updates.length} scores...`);
    // Batch update
    const BATCH_SIZE = 50;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        await prisma.$transaction(updates.slice(i, i + BATCH_SIZE));
        process.stdout.write('.');
    }
    console.log('\nDone.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

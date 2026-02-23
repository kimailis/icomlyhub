import prisma from '../src/config/prisma';

/**
 * Backfill follower counts for all celebrities
 * Run once after applying schema changes
 */
async function backfillFollowerCounts() {
  console.log('Starting follower count backfill...');
  
  const celebrities = await prisma.celebrity.findMany({
    select: { id: true, name: true }
  });

  console.log(`Found ${celebrities.length} celebrities to process`);

  let updated = 0;
  for (const celeb of celebrities) {
    const followerCount = await prisma.follow.count({
      where: { celebrityId: celeb.id }
    });

    await prisma.celebrity.update({
      where: { id: celeb.id },
      data: { followerCount }
    });

    updated++;
    if (updated % 10 === 0) {
      console.log(`Processed ${updated}/${celebrities.length} celebrities`);
    }
  }

  console.log(`✅ Backfill complete! Updated ${updated} celebrities`);
  await prisma.$disconnect();
}

backfillFollowerCounts().catch((error) => {
  console.error('Error during backfill:', error);
  process.exit(1);
});

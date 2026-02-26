import prisma from './src/config/prisma';
import { ImageService } from './src/services/image.service';
import { cleanCelebName } from './src/workers/feed.worker';

async function migrateImages() {
  console.log('Starting image migration to local storage...');
  
  const celebs = await prisma.celebrity.findMany({
    where: {
      imageUrl: {
        startsWith: 'http'
      }
    }
  });

  console.log(`Found ${celebs.length} celebrities with remote images.`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  for (const celeb of celebs) {
    if (celeb.imageUrl.includes('ui-avatars.com')) {
      console.log(`Skipping placeholder for ${celeb.name}`);
      skipCount++;
      continue;
    }

    console.log(`Processing ${celeb.name} (${celeb.id})...`);
    
    // Add 1 second delay between requests
    await delay(1000);

    const localPath = await ImageService.downloadCelebImage(celeb.id, celeb.imageUrl);
    
    if (localPath) {
      await prisma.celebrity.update({
        where: { id: celeb.id },
        data: { imageUrl: localPath }
      });
      console.log(`  Success: ${localPath}`);
      successCount++;
    } else {
      console.log(`  Failed to download image for ${celeb.name}`);
      failCount++;
    }
  }

  console.log('Migration finished.');
  console.log(`Total: ${celebs.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
  console.log(`Failed: ${failCount}`);
}

migrateImages()
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { globalFeedGenerator, regionalFeedGenerator } from '../src/workers/feed.worker';

async function main() {
  console.log('--- TRIGGERING GLOBAL FEED GENERATOR ---');
  await globalFeedGenerator();
  
  console.log('\n--- TRIGGERING REGIONAL FEED GENERATOR ---');
  await regionalFeedGenerator();
  
  console.log('\n--- DONE ---');
}

main()
  .catch(console.error);

// Worker entry point - only initializes BullMQ workers, no Express
import './workers/feed.worker';

console.log('[Worker] Data collection worker is ENABLED.');
console.log('[Worker] Listening for jobs on feed-generation queue...');
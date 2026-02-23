// Worker entry point - only initializes BullMQ workers, no Express
import './workers/feed.worker';
import './workers/social.worker';
import './workers/verification.worker';

console.log('[Worker] Data collection, social, and verification workers are ENABLED.');
console.log('[Worker] Listening for jobs on feed-generation queue...');
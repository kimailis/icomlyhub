import { createClient } from 'redis';

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

redisClient.on('error', (err) => {
  // Only log if not in build process or if it's not a connection error
  if (process.env.NEXT_PHASE !== 'phase-production-build') {
    console.error('Redis Client Error', err);
  }
});

// Auto-connect on module load
(async () => {
    try {
        if (!redisClient.isOpen && process.env.NEXT_PHASE !== 'phase-production-build') {
            await redisClient.connect();
            console.log('Redis connected successfully');
        }
    } catch (err) {
        if (process.env.NEXT_PHASE !== 'phase-production-build') {
            console.error('Redis connection failed:', err);
        }
    }
})();

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Connected to Redis');
  }
};

export default redisClient;

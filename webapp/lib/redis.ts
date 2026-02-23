import { createClient } from 'redis';

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Auto-connect on module load
(async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
            console.log('Redis connected successfully');
        }
    } catch (err) {
        console.error('Redis connection failed:', err);
    }
})();

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Connected to Redis');
  }
};

export default redisClient;

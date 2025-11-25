import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis client singleton
let redis: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redis = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redis.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redis.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  return redis;
};

// Helper functions for Redis GEO operations
export const redisGeo = {
  // Add agent location to Redis GEO
  addAgentLocation: async (agentId: string, longitude: number, latitude: number) => {
    const client = getRedisClient();
    return client.geoadd('agents_locations', longitude, latitude, agentId);
  },

  // Get nearby agents within radius (in meters)
  getNearbyAgents: async (
    longitude: number,
    latitude: number,
    radius: number = 5000, // 5km default
    unit: 'm' | 'km' | 'mi' | 'ft' = 'm'
  ) => {
    const client = getRedisClient();
    return client.georadius(
      'agents_locations',
      longitude,
      latitude,
      radius,
      unit,
      'WITHCOORD',
      'WITHDIST',
      'ASC'
    );
  },

  // Remove agent location
  removeAgentLocation: async (agentId: string) => {
    const client = getRedisClient();
    return client.zrem('agents_locations', agentId);
  },

  // Get all agent locations
  getAllAgentLocations: async () => {
    const client = getRedisClient();
    return client.zrange('agents_locations', 0, -1, 'WITHSCORES');
  },
};

export default getRedisClient;





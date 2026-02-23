const { createClient } = require('redis');
const config = require('./index');

let redisClient;

async function initRedis() {
  redisClient = createClient({
    url: config.redis.uri,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          return new Error('Redis reconnect limit exceeded');
        }
        return Math.min(retries * 100, 3000);
      }
    }
  });
  
  redisClient.on('error', (err) => {
    console.error('[AUTH] Redis error:', err);
  });
  
  redisClient.on('connect', () => {
    console.log('[AUTH] Redis connected');
  });
  
  await redisClient.connect();
}

function getRedisClient() {
  if (!redisClient) throw new Error('Redis client not initialized');
  return redisClient;
}

async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    console.log('[AUTH] Redis disconnected');
  }
}

module.exports = { initRedis, getRedisClient, disconnectRedis };

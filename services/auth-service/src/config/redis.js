const { createClient } = require('redis');
const config = require('./index');
const logger = require('../utils/logger');

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
    logger.error('Redis error', { error: err.message });
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected');
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
    logger.info('Redis disconnected');
  }
}

module.exports = { initRedis, getRedisClient, disconnectRedis };

const { getRedisClient } = require('../config/redis');
const { CACHE_KEYS, TOKEN_CONFIG } = require('../constants/auth.constants');

const USER_CACHE_TTL = 900;

class UserCache {
  async get({ hostName, emailAddress }) {
    const redis = getRedisClient();
    const value = await redis.get(CACHE_KEYS.USER_CACHE(hostName, emailAddress));
    return value ? JSON.parse(value) : null;
  }

  async set({ hostName, emailAddress, user }) {
    const redis = getRedisClient();
    const cacheData = JSON.stringify({
      cognitoUserId: user.cognitoUserId,
      role: user.role,
      hostName: user.hostName,
      userId: user.userId
    });
    await redis.setEx(CACHE_KEYS.USER_CACHE(hostName, emailAddress), USER_CACHE_TTL, cacheData);
  }

  async setRefreshToken({ userId, refreshToken }) {
    const redis = getRedisClient();
    await redis.setEx(CACHE_KEYS.REFRESH_TOKEN(userId), TOKEN_CONFIG.REFRESH_EXPIRY_SECONDS, refreshToken);
  }

  async getRefreshToken({ userId }) {
    const redis = getRedisClient();
    return await redis.get(CACHE_KEYS.REFRESH_TOKEN(userId));
  }

  async invalidate({ hostName, emailAddress }) {
    const redis = getRedisClient();
    await redis.del(CACHE_KEYS.USER_CACHE(hostName, emailAddress));
  }
}

module.exports = UserCache;

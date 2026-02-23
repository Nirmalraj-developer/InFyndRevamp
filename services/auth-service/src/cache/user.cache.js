const { getRedisClient } = require('../config/redis');
const { CACHE_KEYS, TOKEN_CONFIG } = require('../constants/auth.constants');

const USER_CACHE_TTL = 900;

class UserCache {
  async get(params) {
    const { tenantId, hostname, email } = params;
    const redis = getRedisClient();
    const key = CACHE_KEYS.USER_CACHE(tenantId, email);
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(params) {
    const { tenantId, hostname, email, user } = params;
    const redis = getRedisClient();
    const key = CACHE_KEYS.USER_CACHE(tenantId, email);
    const cacheData = {
      cognitoUserId: user.cognitoUserId,
      role: user.role,
      tenantId: user.tenantId,
      userId: user._id?.toString(),
      hostname: hostname
    };
    await redis.setEx(key, USER_CACHE_TTL, JSON.stringify(cacheData));
  }

  async setRefreshToken(params) {
    const { userId, refreshToken } = params;
    const redis = getRedisClient();
    const key = CACHE_KEYS.REFRESH_TOKEN(userId);
    await redis.setEx(key, TOKEN_CONFIG.REFRESH_EXPIRY_SECONDS, refreshToken);
  }

  async getRefreshToken(params) {
    const { userId } = params;
    const redis = getRedisClient();
    const key = CACHE_KEYS.REFRESH_TOKEN(userId);
    return await redis.get(key);
  }

  async invalidate(params) {
    const { tenantId, hostname, email } = params;
    const redis = getRedisClient();
    const key = CACHE_KEYS.USER_CACHE(tenantId, email);
    await redis.del(key);
  }
}

module.exports = UserCache;

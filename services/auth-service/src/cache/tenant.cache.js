const { getRedisClient } = require('../config/redis');

class TenantCache {
  async getTenantConfig(hostName) {
    const redis = getRedisClient();
    const key = `tenant:config:${hostName}`;
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async setTenantConfig(hostName, config) {
    const redis = getRedisClient();
    const key = `tenant:config:${hostName}`;
    const configWithoutLogo = { ...config };
    delete configWithoutLogo.logoDataUri;
    await redis.setEx(key, 3600, JSON.stringify(configWithoutLogo));
  }
}

module.exports = TenantCache;

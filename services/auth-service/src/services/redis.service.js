const { getRedisClient } = require('../config/redis');

const PERMISSION_CACHE_TTL = 900; // 15 minutes

class RedisService {
  static getPermissionKey(workspaceId, userId) {
    return `perm:${workspaceId}:${userId}`;
  }

  static async getPermissionCache(workspaceId, userId) {
    try {
      const redis = getRedisClient();
      const key = this.getPermissionKey(workspaceId, userId);
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('[RedisService] Get permission cache error:', error);
      return null;
    }
  }

  static async setPermissionCache(workspaceId, userId, permissions, restrictions) {
    try {
      const redis = getRedisClient();
      const key = this.getPermissionKey(workspaceId, userId);
      const data = { permissions, restrictions };
      await redis.set(key, JSON.stringify(data), { EX: PERMISSION_CACHE_TTL });
    } catch (error) {
      console.error('[RedisService] Set permission cache error:', error);
    }
  }

  static async invalidateUserPermission(workspaceId, userId) {
    try {
      const redis = getRedisClient();
      const key = this.getPermissionKey(workspaceId, userId);
      await redis.del(key);
    } catch (error) {
      console.error('[RedisService] Invalidate user permission error:', error);
    }
  }

  static async invalidateWorkspacePermissions(workspaceId) {
    try {
      const redis = getRedisClient();
      const pattern = `perm:${workspaceId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      console.error('[RedisService] Invalidate workspace permissions error:', error);
    }
  }
}

module.exports = RedisService;

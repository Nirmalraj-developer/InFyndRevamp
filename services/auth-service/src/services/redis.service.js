'use strict';

const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

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
      logger.error('Get permission cache error', { workspaceId, userId, error: error.message });
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
      logger.error('Set permission cache error', { workspaceId, userId, error: error.message });
    }
  }

  static async invalidateUserPermission(workspaceId, userId) {
    try {
      const redis = getRedisClient();
      const key = this.getPermissionKey(workspaceId, userId);
      await redis.del(key);
    } catch (error) {
      logger.error('Invalidate user permission error', { workspaceId, userId, error: error.message });
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
      logger.error('Invalidate workspace permissions error', { workspaceId, error: error.message });
    }
  }
}

module.exports = RedisService;

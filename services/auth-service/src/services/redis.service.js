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

  // Session Management
  static async createSession(sessionKey, data, ttl) {
    try {
      const redis = getRedisClient();
      const key = `session:${sessionKey}`;
      const userSessionsKey = `user_sessions:${data.userId}`;
      await redis.set(key, JSON.stringify(data), { EX: ttl });
      await redis.sAdd(userSessionsKey, sessionKey);
    } catch (error) {
      logger.error('Create session error', { sessionKey, error: error.message });
      throw error;
    }
  }

  static async getSession(sessionKey) {
    try {
      const redis = getRedisClient();
      const key = `session:${sessionKey}`;
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Get session error', { sessionKey, error: error.message });
      return null;
    }
  }

  static async blockSession(sessionKey, ttl) {
    try {
      const redis = getRedisClient();
      const key = `blocked_session:${sessionKey}`;
      await redis.set(key, '1', { EX: ttl });
      await redis.del(`session:${sessionKey}`);
    } catch (error) {
      logger.error('Block session error', { sessionKey, error: error.message });
    }
  }

  static async isSessionBlocked(sessionKey) {
    try {
      const redis = getRedisClient();
      const key = `blocked_session:${sessionKey}`;
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Is session blocked error', { sessionKey, error: error.message });
      return false;
    }
  }

  static async removeUserSession(userId, sessionKey) {
    try {
      const redis = getRedisClient();
      const key = `user_sessions:${userId}`;
      await redis.sRem(key, sessionKey);
    } catch (error) {
      logger.error('Remove user session error', { userId, sessionKey, error: error.message });
    }
  }

  static async invalidateAllUserSessions(userId) {
    try {
      const redis = getRedisClient();
      const userSessionsKey = `user_sessions:${userId}`;
      const sessionKeys = await redis.sMembers(userSessionsKey);

      for (const sessionKey of sessionKeys) {
        await this.blockSession(sessionKey, 3600 * 24); // Block for 24h as a safeguard
      }

      await redis.del(userSessionsKey);
    } catch (error) {
      logger.error('Invalidate all user sessions error', { userId, error: error.message });
    }
  }
}

module.exports = RedisService;

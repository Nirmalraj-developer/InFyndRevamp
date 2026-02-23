class CacheService {
  constructor(dependencies) {
    this.redisClient = dependencies.redisClient;
    this.ttl = dependencies.ttl || 3600; // 1 hour default
  }

  async setUserCache(params) {
    const { tenantId, hostname, email, user } = params;
    const key = `user:${tenantId}:${hostname}:${email}`;
    
    await this.redisClient.setEx(key, this.ttl, JSON.stringify({
      userId: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    }));
  }

  async getUserCache(params) {
    const { tenantId, hostname, email } = params;
    const key = `user:${tenantId}:${hostname}:${email}`;
    
    const cached = await this.redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async invalidateUserTeams(userId) {
    const pattern = `teams:${userId}:*`;
    const keys = await this.redisClient.keys(pattern);
    
    if (keys.length > 0) {
      await this.redisClient.del(keys);
    }
  }

  async invalidateTeamCredits(teamId) {
    const key = `team:credits:${teamId}`;
    await this.redisClient.del(key);
  }

  async setTeamCredits(teamId, credits) {
    const key = `team:credits:${teamId}`;
    await this.redisClient.setEx(key, this.ttl, credits.toString());
  }

  async getTeamCredits(teamId) {
    const key = `team:credits:${teamId}`;
    const cached = await this.redisClient.get(key);
    return cached ? parseInt(cached) : null;
  }
}

module.exports = CacheService;
const crypto = require('crypto');
const { getRedisClient } = require('../config/redis');
const { OTP_CONFIG, CACHE_KEYS } = require('../constants/auth.constants');

class OtpCache {
  generateOtp() {
    return crypto.randomInt(OTP_CONFIG.MIN, OTP_CONFIG.MAX).toString();
  }

  async setRegistrationOtp(params) {
    const { userId, hostName, email, otp, expiresInSec } = params;
    const redis = getRedisClient();
    const key = CACHE_KEYS.REGISTER_OTP(userId, hostName);
    const payload = {
      otp,
      email,
      expiresIn: expiresInSec,
      expiresAt: Date.now() + (expiresInSec * 1000)
    };
    await redis.setEx(key, expiresInSec, JSON.stringify(payload));
    return payload;
  }

  async getRegistrationOtp(params) {
    const { userId, hostName } = params;
    const redis = getRedisClient();
    const key = CACHE_KEYS.REGISTER_OTP(userId, hostName);
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async deleteRegistrationOtp(params) {
    const { userId, hostName } = params;
    const redis = getRedisClient();
    const key = CACHE_KEYS.REGISTER_OTP(userId, hostName);
    await redis.del(key);
  }

  async setLoginOtp(params) {
    const { email, tenantId, otp, expiresInSec } = params;
    const redis = getRedisClient();
    const key = CACHE_KEYS.LOGIN_OTP(email, tenantId);
    const payload = {
      otp,
      email,
      expiresIn: expiresInSec,
      expiresAt: Date.now() + (expiresInSec * 1000)
    };
    await redis.setEx(key, expiresInSec, JSON.stringify(payload));
    return payload;
  }

  async getLoginOtp(params) {
    const { email, tenantId } = params;
    const redis = getRedisClient();
    const key = CACHE_KEYS.LOGIN_OTP(email, tenantId);
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async deleteLoginOtp(params) {
    const { email, tenantId } = params;
    const redis = getRedisClient();
    const key = CACHE_KEYS.LOGIN_OTP(email, tenantId);
    await redis.del(key);
  }
}

module.exports = OtpCache;

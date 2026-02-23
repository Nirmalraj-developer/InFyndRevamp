const crypto = require('crypto');
const { getRedisClient } = require('../config/redis');
const { OTP_CONFIG, CACHE_KEYS } = require('../constants/auth.constants');

class OtpCache {
  generateOtp() {
    return crypto.randomInt(OTP_CONFIG.MIN, OTP_CONFIG.MAX).toString();
  }

  async setRegistrationOtp({ userId, hostName, emailAddress, otp, expiresInSec }) {
    const redis = getRedisClient();
    const key = CACHE_KEYS.REGISTER_OTP(userId, hostName);
    const payload = JSON.stringify({
      otp,
      emailAddress,
      expiresAt: Date.now() + (expiresInSec * 1000)
    });
    await redis.setEx(key, expiresInSec, payload);
  }

  async getRegistrationOtp({ userId, hostName }) {
    const redis = getRedisClient();
    const key = CACHE_KEYS.REGISTER_OTP(userId, hostName);
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async deleteRegistrationOtp({ userId, hostName }) {
    const redis = getRedisClient();
    await redis.del(CACHE_KEYS.REGISTER_OTP(userId, hostName));
  }

  async setLoginOtp({ emailAddress, hostName, otp, expiresInSec }) {
    const redis = getRedisClient();
    const key = CACHE_KEYS.LOGIN_OTP(emailAddress, hostName);
    const payload = JSON.stringify({
      otp,
      emailAddress,
      expiresAt: Date.now() + (expiresInSec * 1000)
    });
    await redis.setEx(key, expiresInSec, payload);
  }

  async getLoginOtp({ emailAddress, hostName }) {
    const redis = getRedisClient();
    const key = CACHE_KEYS.LOGIN_OTP(emailAddress, hostName);
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async deleteLoginOtp({ emailAddress, hostName }) {
    const redis = getRedisClient();
    await redis.del(CACHE_KEYS.LOGIN_OTP(emailAddress, hostName));
  }
}

module.exports = OtpCache;

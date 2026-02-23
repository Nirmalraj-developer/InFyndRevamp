const crypto = require('crypto');
const { getRedisClient } = require('../config/redis');

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

class OtpService {
  async generateAndStore(email, tenantId) {
    const redis = getRedisClient();
    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);
    
    const key = `otp:${tenantId}:${email}`;
    
    // Store OTP data structure
    const otpData = {
      hashedOtp,
      attemptCount: 0,
      expiresAt: Date.now() + 300000 // 5 minutes
    };
    
    await redis.setEx(key, 300, JSON.stringify(otpData));
    
    // Store rate limit
    const rateLimitKey = `otp:ratelimit:${tenantId}:${email}`;
    await redis.incr(rateLimitKey);
    await redis.expire(rateLimitKey, 60);
    
    return otp;
  }
  
  async verify(email, otp, tenantId) {
    const redis = getRedisClient();
    const key = `otp:${tenantId}:${email}`;
    
    // Get OTP data
    const otpDataStr = await redis.get(key);
    if (!otpDataStr) {
      throw new Error('OTP expired or not found');
    }
    
    const otpData = JSON.parse(otpDataStr);
    
    // Check attempts
    if (otpData.attemptCount >= 3) {
      throw new Error('Too many attempts');
    }
    
    // Increment attempt count
    otpData.attemptCount++;
    await redis.setEx(key, 300, JSON.stringify(otpData));
    
    // Verify OTP
    const hashedOtp = hashOTP(otp);
    if (hashedOtp !== otpData.hashedOtp) {
      throw new Error('Invalid OTP');
    }
    
    // Delete OTP after successful verification
    await redis.del(key);
    
    return true;
  }
  
  async checkRateLimit(email, tenantId) {
    const redis = getRedisClient();
    const rateLimitKey = `otp:ratelimit:${tenantId}:${email}`;
    const count = await redis.get(rateLimitKey);
    
    if (count && parseInt(count) >= 3) {
      throw new Error('Rate limit exceeded - max 3 OTP requests per minute');
    }
  }
}

module.exports = OtpService;

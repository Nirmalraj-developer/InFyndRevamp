const rateLimit = require('express-rate-limit');
const { RATE_LIMIT_CONFIG } = require('../constants/security.constants');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, error: message || RATE_LIMIT_CONFIG.MESSAGE },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: message || RATE_LIMIT_CONFIG.MESSAGE,
          statusCode: 429
        },
        correlationId: req.correlationId
      });
    }
  });
};

const authRateLimiter = createRateLimiter(
  RATE_LIMIT_CONFIG.AUTH_WINDOW_MS,
  RATE_LIMIT_CONFIG.AUTH_MAX_REQUESTS,
  'Too many authentication attempts, please try again later'
);

const generalRateLimiter = createRateLimiter(
  RATE_LIMIT_CONFIG.WINDOW_MS,
  RATE_LIMIT_CONFIG.MAX_REQUESTS
);

module.exports = {
  authRateLimiter,
  generalRateLimiter
};

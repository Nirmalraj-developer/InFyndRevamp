const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  AUTH_WINDOW_MS: 15 * 60 * 1000,
  AUTH_MAX_REQUESTS: 5,
  MESSAGE: 'Too many requests, please try again later'
};

const VALIDATION_CONFIG = {
  EMAIL_MIN_LENGTH: 5,
  EMAIL_MAX_LENGTH: 100,
  USERNAME_MIN_LENGTH: 2,
  USERNAME_MAX_LENGTH: 50,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  OTP_LENGTH: 6,
  HOSTNAME_MAX_LENGTH: 100
};

const HELMET_CONFIG = {
  CONTENT_SECURITY_POLICY: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  HSTS_MAX_AGE: 31536000, // 1 year
  HSTS_INCLUDE_SUBDOMAINS: true,
  HSTS_PRELOAD: true
};

const HTTPS_CONFIG = {
  ENFORCE_HTTPS: process.env.ENFORCE_HTTPS !== 'false',
  ALLOW_DEVELOPMENT: process.env.NODE_ENV === 'development'
};

const SANITIZE_CONFIG = {
  REPLACE_WITH: '_',
  ALLOW_DOTS: false
};

module.exports = {
  RATE_LIMIT_CONFIG,
  VALIDATION_CONFIG,
  HELMET_CONFIG,
  HTTPS_CONFIG,
  SANITIZE_CONFIG
};

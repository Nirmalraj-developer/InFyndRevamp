const ERROR_CODES = {
  VALIDATION_ERROR: 'AUTH_001',
  USER_EXISTS: 'AUTH_002',
  USER_NOT_FOUND: 'AUTH_003',
  DOMAIN_SUPPRESSED: 'AUTH_004',
  OTP_EXPIRED: 'AUTH_005',
  INVALID_OTP: 'AUTH_006',
  INVALID_CREDENTIALS: 'AUTH_007',
  INVALID_TOKEN: 'AUTH_008',
  SERVICE_TIMEOUT: 'AUTH_009'
};

const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Required fields are missing',
  USER_EXISTS: 'User already exists',
  USER_EXISTS_COGNITO: 'User already exists in Cognito',
  USER_NOT_FOUND: 'User not found',
  DOMAIN_SUPPRESSED: 'Registration not allowed for this domain',
  OTP_EXPIRED: 'OTP Expired',
  INVALID_OTP: 'Invalid OTP',
  INVALID_CREDENTIALS: 'Invalid credentials',
  INVALID_TOKEN: 'Invalid or expired token',
  SERVICE_TIMEOUT: 'External service temporarily unavailable, please retry'
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409
};

const USER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended'
};

const USER_ROLE = {
  USER: 'user',
  ADMIN: 'admin'
};

const OTP_CONFIG = {
  EXPIRY_SECONDS: 300,
  LENGTH: 6,
  MIN: 100000,
  MAX: 999999
};

const CACHE_KEYS = {
  REGISTER_OTP: (userId, hostName) => `registerOtp:${userId}:${hostName}`,
  LOGIN_OTP: (email, tenantId) => `loginOtp:${email}:${tenantId}`,
  USER_CACHE: (tenantId, email) => `user:${tenantId}:${email}`,
  REFRESH_TOKEN: (userId) => `refreshToken:${userId}`
};

const TOKEN_CONFIG = {
  ACCESS_EXPIRY: '15m',
  REFRESH_EXPIRY: '7d',
  REFRESH_EXPIRY_SECONDS: 7 * 24 * 60 * 60
};

const TIMEOUT_CONFIG = {
  COGNITO_TIMEOUT_MS: 2000,
  REDIS_TIMEOUT_MS: 500,
  COGNITO_RETRY_COUNT: 2,
  REDIS_RETRY_COUNT: 1
};

const SUCCESS_MESSAGES = {
  OTP_SENT: 'OTP sent to your email',
  EMAIL_VERIFIED: 'Email verified successfully',
  LOGIN_SUCCESS: 'Login successful',
  TOKEN_REFRESHED: 'Token refreshed successfully'
};

module.exports = {
  ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS,
  USER_STATUS,
  USER_ROLE,
  OTP_CONFIG,
  CACHE_KEYS,
  TOKEN_CONFIG,
  TIMEOUT_CONFIG,
  SUCCESS_MESSAGES
};

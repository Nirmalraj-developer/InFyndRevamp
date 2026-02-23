const jwt = require('jsonwebtoken');
const config = require('../config');
const { TOKEN_CONFIG } = require('../constants/auth.constants');

function generateAccessToken(params) {
  const { user } = params;
  const payload = {
    sub: user._id.toString(),
    userId: user._id.toString(),
    tenantId: user.tenantId,
    role: user.role,
    type: 'access',
    iat: Math.floor(Date.now() / 1000)
  };
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: TOKEN_CONFIG.ACCESS_EXPIRY
  });
}

function generateRefreshToken(params) {
  const { user } = params;
  const payload = {
    sub: user._id.toString(),
    userId: user._id.toString(),
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: TOKEN_CONFIG.REFRESH_EXPIRY
  });
}

function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    return decoded.type === 'access' ? decoded : null;
  } catch (error) {
    return null;
  }
}

function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    return decoded.type === 'refresh' ? decoded : null;
  } catch (error) {
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};

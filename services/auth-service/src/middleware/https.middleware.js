const { HTTPS_CONFIG } = require('../constants/security.constants');

const enforceHttps = (req, res, next) => {
  if (HTTPS_CONFIG.ALLOW_DEVELOPMENT) {
    return next();
  }

  if (!HTTPS_CONFIG.ENFORCE_HTTPS) {
    return next();
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  
  if (protocol !== 'https') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'HTTPS_REQUIRED',
        message: 'HTTPS is required for this endpoint',
        statusCode: 403
      },
      correlationId: req.correlationId
    });
  }

  next();
};

module.exports = enforceHttps;

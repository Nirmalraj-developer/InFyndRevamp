const express = require('express');
const { resolveTenant } = require('../middleware/tenant-resolver.middleware');
const { authRateLimiter } = require('../middleware/rateLimit.middleware');
const {
  validateRegisterInitiate,
  validateRegisterVerify,
  validateLogin,
  validateLoginOtpRequest,
  validateLoginOtpVerify,
  validateRefreshToken,
  validateResendOtp
} = require('../middleware/requestValidation.middleware');

const router = express.Router();

let authController;
const getAuthController = () => {
  if (!authController) {
    const { container } = require('../container/di-container');
    authController = container.getAuthController();
  }
  return authController;
};

router.post('/register/initiate', 
  authRateLimiter,
  resolveTenant,
  validateRegisterInitiate,
  (req, res, next) => {
    getAuthController().registerInitiate(req, res, next);
  }
);

router.post('/register/verify',
  authRateLimiter,
  resolveTenant,
  validateRegisterVerify,
  (req, res, next) => {
    getAuthController().registerVerify(req, res, next);
  }
);

router.post('/resend-registration-otp',
  authRateLimiter,
  resolveTenant,
  validateResendOtp,
  (req, res, next) => {
    getAuthController().resendRegistrationOtp(req, res, next);
  }
);

router.post('/login',
  authRateLimiter,
  resolveTenant,
  validateLoginOtpRequest,
  (req, res, next) => {
    getAuthController().login(req, res, next);
  }
);

router.post('/login/request-otp',
  authRateLimiter,
  resolveTenant,
  validateLoginOtpRequest,
  (req, res, next) => {
    getAuthController().requestLoginOtp(req, res, next);
  }
);

router.post('/login/verify-otp',
  authRateLimiter,
  resolveTenant,
  validateLoginOtpVerify,
  (req, res, next) => {
    getAuthController().verifyLoginOtp(req, res, next);
  }
);

router.post('/refresh-token',
  authRateLimiter,
  resolveTenant,
  validateRefreshToken,
  (req, res, next) => {
    getAuthController().refreshToken(req, res, next);
  }
);

router.post('/login/resend-otp',
  authRateLimiter,
  resolveTenant,
  validateLoginOtpRequest,
  (req, res, next) => {
    getAuthController().resendLoginOtp(req, res, next);
  }
);

module.exports = router;

const express = require('express');
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
const { authenticateSession } = require('../middleware/authSession.middleware');

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
  validateRegisterInitiate,
  (req, res, next) => {
    getAuthController().registerInitiate(req, res, next);
  }
);

router.post('/register/verify',
  authRateLimiter,
  validateRegisterVerify,
  (req, res, next) => {
    getAuthController().registerVerify(req, res, next);
  }
);

router.post('/resend-registration-otp',
  authRateLimiter,
  validateResendOtp,
  (req, res, next) => {
    getAuthController().resendRegistrationOtp(req, res, next);
  }
);

router.post('/login',
  authRateLimiter,
  validateLoginOtpRequest,
  (req, res, next) => {
    getAuthController().login(req, res, next);
  }
);

router.post('/login/request-otp',
  authRateLimiter,
  validateLoginOtpRequest,
  (req, res, next) => {
    getAuthController().requestLoginOtp(req, res, next);
  }
);

router.post('/login/verify-otp',
  authRateLimiter,
  validateLoginOtpVerify,
  (req, res, next) => {
    getAuthController().verifyLoginOtp(req, res, next);
  }
);

router.post('/refresh-token',
  authRateLimiter,
  validateRefreshToken,
  (req, res, next) => {
    getAuthController().refreshToken(req, res, next);
  }
);

router.post('/login/resend-otp',
  authRateLimiter,
  validateLoginOtpRequest,
  (req, res, next) => {
    getAuthController().resendLoginOtp(req, res, next);
  }
);

router.post('/logout',
  authenticateSession,
  (req, res, next) => {
    getAuthController().logout(req, res, next);
  }
);

router.post('/logout-all',
  authenticateSession,
  (req, res, next) => {
    getAuthController().logoutAllDevices(req, res, next);
  }
);

module.exports = router;

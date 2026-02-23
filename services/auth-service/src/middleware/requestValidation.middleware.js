const { body, validationResult } = require('express-validator');
const { VALIDATION_CONFIG } = require('../constants/security.constants');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errors.array(),
        statusCode: 400
      },
      correlationId: req.correlationId
    });
  }
  next();
};

const validateRegisterInitiate = [
  body("emailAddress")
    .isEmail()
    .withMessage("Invalid email format")
    .isLength({
      min: VALIDATION_CONFIG.EMAIL_MIN_LENGTH,
      max: VALIDATION_CONFIG.EMAIL_MAX_LENGTH,
    })
    .withMessage(
      `Email must be between ${VALIDATION_CONFIG.EMAIL_MIN_LENGTH} and ${VALIDATION_CONFIG.EMAIL_MAX_LENGTH} characters`,
    )
    .normalizeEmail(),
  body("userName")
    .trim()
    .isLength({
      min: VALIDATION_CONFIG.USERNAME_MIN_LENGTH,
      max: VALIDATION_CONFIG.USERNAME_MAX_LENGTH,
    })
    .withMessage(
      `Username must be between ${VALIDATION_CONFIG.USERNAME_MIN_LENGTH} and ${VALIDATION_CONFIG.USERNAME_MAX_LENGTH} characters`,
    )
    .matches(/^[a-zA-Z0-9\s]+$/)
    .withMessage("Username can only contain letters, numbers and spaces"),
  body("hostName")
    .trim()
    .notEmpty()
    .withMessage("Hostname is required")
    .isLength({ max: VALIDATION_CONFIG.HOSTNAME_MAX_LENGTH })
    .withMessage(
      `Hostname must not exceed ${VALIDATION_CONFIG.HOSTNAME_MAX_LENGTH} characters`,
    ),
  body("companyName")
    .optional()
    .trim()
    .isLength({ max: VALIDATION_CONFIG.USERNAME_MAX_LENGTH })
    .withMessage(
      `Company name must not exceed ${VALIDATION_CONFIG.USERNAME_MAX_LENGTH} characters`,
    ),
  handleValidationErrors,
];

const validateRegisterVerify = [
  body("emailAddress")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("otp")
    .trim()
    .isLength({
      min: VALIDATION_CONFIG.OTP_LENGTH,
      max: VALIDATION_CONFIG.OTP_LENGTH,
    })
    .withMessage(`OTP must be ${VALIDATION_CONFIG.OTP_LENGTH} digits`)
    .isNumeric()
    .withMessage("OTP must be numeric"),
  body("hostName").trim().notEmpty().withMessage("Hostname is required"),
  handleValidationErrors,
];

const validateLogin = [
  body("emailAddress")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("password")
    .trim()
    .isLength({
      min: VALIDATION_CONFIG.PASSWORD_MIN_LENGTH,
      max: VALIDATION_CONFIG.PASSWORD_MAX_LENGTH,
    })
    .withMessage(
      `Password must be between ${VALIDATION_CONFIG.PASSWORD_MIN_LENGTH} and ${VALIDATION_CONFIG.PASSWORD_MAX_LENGTH} characters`,
    ),
  handleValidationErrors,
];

const validateLoginOtpRequest = [
  body("emailAddress")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  handleValidationErrors,
];

const validateLoginOtpVerify = [
  body("emailAddress")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("otp")
    .trim()
    .isLength({
      min: VALIDATION_CONFIG.OTP_LENGTH,
      max: VALIDATION_CONFIG.OTP_LENGTH,
    })
    .withMessage(`OTP must be ${VALIDATION_CONFIG.OTP_LENGTH} digits`)
    .isNumeric()
    .withMessage("OTP must be numeric"),
  handleValidationErrors,
];

const validateRefreshToken = [
  body('refreshToken')
    .trim()
    .notEmpty().withMessage('Refresh token is required'),
  handleValidationErrors
];

const validateResendOtp = [
  body("emailAddress")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  handleValidationErrors,
];

module.exports = {
  validateRegisterInitiate,
  validateRegisterVerify,
  validateLogin,
  validateLoginOtpRequest,
  validateLoginOtpVerify,
  validateRefreshToken,
  validateResendOtp
};

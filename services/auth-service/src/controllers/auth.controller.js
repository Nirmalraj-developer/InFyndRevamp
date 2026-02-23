const { sendSuccess } = require('../utils/response.util');
const AppError = require('../utils/app-error');
const { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } = require('../constants/auth.constants');

class AuthController {
  constructor(dependencies) {
    this.authService = dependencies.authService;
    this.registerInitiate = this.registerInitiate.bind(this);
    this.registerVerify = this.registerVerify.bind(this);
    this.resendRegistrationOtp = this.resendRegistrationOtp.bind(this);
    this.login = this.login.bind(this);
    this.requestLoginOtp = this.requestLoginOtp.bind(this);
    this.verifyLoginOtp = this.verifyLoginOtp.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    this.resendLoginOtp = this.resendLoginOtp.bind(this);
  }

  async registerInitiate(req, res, next) {
    try {
      const { emailAddress, userName, companyName } = req.body;
      const hostName = req.hostname || req.get('host');

      if (!emailAddress || !userName || !hostName) {
        throw new AppError(ERROR_MESSAGES.VALIDATION_ERROR, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      }

      const result = await this.authService.registerInitiate({
        emailAddress,
        userName,
        companyName,
        hostName,
        correlationId: req.correlationId
      });

      return sendSuccess(res, {
        data: result,
        message: result.message,
        statusCode: HTTP_STATUS.OK,
        correlationId: req.correlationId
      });
    } catch (error) {
      next(error);
    }
  }

  async registerVerify(req, res, next) {
    try {
      const { emailAddress, otp } = req.body;
      const hostName = req.hostname || req.get('host');

      if (!emailAddress || !otp || !hostName) {
        throw new AppError(ERROR_MESSAGES.VALIDATION_ERROR, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      }

      const result = await this.authService.registerVerify({
        emailAddress,
        otp,
        hostName,
        correlationId: req.correlationId
      });

      return sendSuccess(res, {
        data: result,
        message: result.message,
        statusCode: HTTP_STATUS.OK,
        correlationId: req.correlationId
      });
    } catch (error) {
      next(error);
    }
  }

  async resendRegistrationOtp(req, res, next) {
    try {
      const { emailAddress } = req.body;
      const hostName = req.hostname || req.get('host');

      if (!emailAddress) {
        throw new AppError(ERROR_MESSAGES.VALIDATION_ERROR, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      }

      const result = await this.authService.resendRegistrationOtp({
        emailAddress,
        hostName,
        correlationId: req.correlationId
      });

      return sendSuccess(res, {
        data: result,
        message: result.message,
        statusCode: HTTP_STATUS.OK,
        correlationId: req.correlationId
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { emailAddress } = req.body;
      const hostName = req.hostname || req.get('host');

      if (!emailAddress) {
        throw new AppError(ERROR_MESSAGES.VALIDATION_ERROR, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      }

      const result = await this.authService.login({
        emailAddress,
        hostName,
        correlationId: req.correlationId
      });

      return sendSuccess(res, {
        data: result,
        message: result.message,
        statusCode: HTTP_STATUS.OK,
        correlationId: req.correlationId
      });
    } catch (error) {
      next(error);
    }
  }

  async requestLoginOtp(req, res, next) {
    try {
      const { emailAddress } = req.body;
      const hostName = req.hostname || req.get('host');

      if (!emailAddress) {
        throw new AppError(ERROR_MESSAGES.VALIDATION_ERROR, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      }

      const result = await this.authService.requestLoginOtp({
        emailAddress,
        hostName,
        correlationId: req.correlationId
      });

      return sendSuccess(res, {
        data: result,
        message: result.message,
        statusCode: HTTP_STATUS.OK,
        correlationId: req.correlationId
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyLoginOtp(req, res, next) {
    try {
      const { emailAddress, otp } = req.body;
      const hostName = req.hostname || req.get('host');

      if (!emailAddress || !otp) {
        throw new AppError(ERROR_MESSAGES.VALIDATION_ERROR, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      }

      const result = await this.authService.verifyLoginOtp({
        emailAddress,
        otp,
        hostName,
        correlationId: req.correlationId
      });

      return sendSuccess(res, {
        data: result,
        message: result.message,
        statusCode: HTTP_STATUS.OK,
        correlationId: req.correlationId
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError(ERROR_MESSAGES.VALIDATION_ERROR, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      }

      const result = await this.authService.refreshToken({
        refreshToken,
        correlationId: req.correlationId
      });

      return sendSuccess(res, {
        data: result,
        message: result.message,
        statusCode: HTTP_STATUS.OK,
        correlationId: req.correlationId
      });
    } catch (error) {
      next(error);
    }
  }

  async resendLoginOtp(req, res, next) {
    try {
      const { emailAddress } = req.body;
      const hostName = req.hostname || req.get('host');

      if (!emailAddress) {
        throw new AppError(ERROR_MESSAGES.VALIDATION_ERROR, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      }

      const result = await this.authService.resendLoginOtp({
        emailAddress,
        hostName,
        correlationId: req.correlationId
      });

      return sendSuccess(res, {
        data: result,
        message: result.message,
        statusCode: HTTP_STATUS.OK,
        correlationId: req.correlationId
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;

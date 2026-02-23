'use strict';

const AppError = require('../utils/app-error');
const logger = require('../utils/logger');
const { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS, SUCCESS_MESSAGES, TIMEOUT_CONFIG } = require('../constants/auth.constants');
const { executeWithTimeoutAndRetry } = require('../utils/timeoutRetry.util');

class AuthService {
  constructor(dependencies) {
    this.userRepository = dependencies.userRepository;
    this.cognitoService = dependencies.cognitoService;
    this.otpCache = dependencies.otpCache;
    this.userCache = dependencies.userCache;
    this.kafkaPublisher = dependencies.kafkaPublisher;
    this.jwtUtil = dependencies.jwtUtil;
    this.config = dependencies.config;
  }

  async registerInitiate(params) {
    const { emailAddress, userName, companyName, hostName, correlationId } = params;

    const domain = (emailAddress.split('@')[1] || '').toLowerCase();
    if (this.config.registration.suppressedDomains.includes(domain)) {
      throw new AppError(ERROR_MESSAGES.DOMAIN_SUPPRESSED, ERROR_CODES.DOMAIN_SUPPRESSED, HTTP_STATUS.BAD_REQUEST);
    }

    const existingUser = await this.userRepository.findByEmailAndHostName(
      { emailAddress, hostName },
      { projection: { _id: 1 } }
    );
    if (existingUser) {
      throw new AppError(ERROR_MESSAGES.USER_EXISTS, ERROR_CODES.USER_EXISTS, HTTP_STATUS.CONFLICT);
    }

    const user = await this.userRepository.createRegistrationCandidate({
      emailAddress,
      userName,
      companyName,
      hostName
    });

    const userId = user.userId;

    let cognitoSub;
    try {
      const cognitoResult = await executeWithTimeoutAndRetry(
        () => this.cognitoService.adminCreateUser({
          emailAddress,
          userName,
          hostName
        }),
        TIMEOUT_CONFIG.COGNITO_TIMEOUT_MS,
        TIMEOUT_CONFIG.COGNITO_RETRY_COUNT
      );
      cognitoSub = cognitoResult.sub;
    } catch (cognitoError) {
      logger.error('Cognito user creation failed', { userId, emailAddress, error: cognitoError.message });
      throw cognitoError;
    }

    await this.userRepository.updateCognitoSubId(user._id, cognitoSub);

    console.log('🔐 [AUTH] Step 1: Generating OTP for registration');
    const otp = this.otpCache.generateOtp();
    console.log('✅ [AUTH] OTP generated:', otp);

    console.log('💾 [AUTH] Step 2: Storing OTP in Redis');
    await executeWithTimeoutAndRetry(
      () => this.otpCache.setRegistrationOtp({
        userId,
        hostName,
        emailAddress,
        otp,
        expiresInSec: this.config.registration.otpExpiryTimeSec
      }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );
    console.log('✅ [AUTH] OTP stored in Redis');

    console.log('📤 [AUTH] Step 3: Publishing OTP event to Kafka');
    this.kafkaPublisher.publishUserRegistrationOtpSend({
      userId,
      emailAddress,
      userName,
      companyName,
      otp,
      hostName,
      correlationId
    }).then(() => {
      console.log('✅ [AUTH] Kafka event published successfully');
    }).catch(err => {
      console.error('❌ [AUTH] Failed to publish Kafka event:', err.message);
      logger.error('Failed to publish registration OTP event', { userId, error: err.message });
    });

    logger.info('Registration initiated', { userId, emailAddress, hostName });

    return {
      message: SUCCESS_MESSAGES.OTP_SENT,
      userId
    };
  }

  async registerVerify(params) {
    const { emailAddress, otp, hostName, correlationId } = params;

    const user = await this.userRepository.findByEmailAndHostName(
      { emailAddress, hostName },
      { projection: { _id: 1, userId: 1, emailAddress: 1, userName: 1, companyName: 1, hostName: 1, status: 1 } }
    );
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const userId = user.userId;

    const otpData = await executeWithTimeoutAndRetry(
      () => this.otpCache.getRegistrationOtp({ userId, hostName }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    if (!otpData) {
      throw new AppError(ERROR_MESSAGES.OTP_EXPIRED, ERROR_CODES.OTP_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }

    if (Date.now() > otpData.expiresAt) {
      throw new AppError(ERROR_MESSAGES.OTP_EXPIRED, ERROR_CODES.OTP_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }

    if (otpData.otp !== otp) {
      throw new AppError(ERROR_MESSAGES.INVALID_OTP, ERROR_CODES.INVALID_OTP, HTTP_STATUS.BAD_REQUEST);
    }

    await executeWithTimeoutAndRetry(
      () => this.cognitoService.adminConfirmSignUp({
        emailAddress,
        hostName
      }),
      TIMEOUT_CONFIG.COGNITO_TIMEOUT_MS,
      TIMEOUT_CONFIG.COGNITO_RETRY_COUNT
    );

    const updatedUser = await this.userRepository.markRegistrationVerified(user._id);

    await executeWithTimeoutAndRetry(
      () => this.otpCache.deleteRegistrationOtp({ userId, hostName }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    this.kafkaPublisher.publishUserRegistrationWelcomeEmail({
      userId,
      emailAddress: updatedUser.emailAddress,
      userName: updatedUser.userName,
      companyName: updatedUser.companyName,
      hostName,
      correlationId
    }).catch(err => logger.error('Failed to publish welcome email event', { userId, error: err.message }));

    logger.info('Registration verified', { userId, emailAddress });

    return {
      message: SUCCESS_MESSAGES.EMAIL_VERIFIED,
      user: {
        userId: updatedUser.userId,
        emailAddress: updatedUser.emailAddress,
        userName: updatedUser.userName,
        status: updatedUser.status
      }
    };
  }

  async resendRegistrationOtp(params) {
    const { emailAddress, hostName, correlationId } = params;

    const user = await this.userRepository.findByEmailAndHostName(
      { emailAddress, hostName },
      { projection: { _id: 1, userId: 1, emailAddress: 1, userName: 1, companyName: 1, hostName: 1, isVerified: 1 } }
    );
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const userId = user.userId;

    if (user.isVerified) {
      throw new AppError('User already verified', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }

    const existingOtp = await executeWithTimeoutAndRetry(
      () => this.otpCache.getRegistrationOtp({ userId, hostName }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    if (existingOtp) {
      throw new AppError('OTP already sent. Please wait before requesting again.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }

    const otp = this.otpCache.generateOtp();

    await executeWithTimeoutAndRetry(
      () => this.otpCache.setRegistrationOtp({
        userId,
        hostName,
        emailAddress,
        otp,
        expiresInSec: this.config.registration.otpExpiryTimeSec
      }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    this.kafkaPublisher.publishUserRegistrationOtpSend({
      userId,
      emailAddress: user.emailAddress,
      userName: user.userName,
      companyName: user.companyName,
      otp,
      hostName,
      correlationId
    }).catch(err => logger.error('Failed to publish resend OTP event', { userId, error: err.message }));

    return { message: 'OTP resent successfully' };
  }

  async login(params) {
    const { emailAddress, hostName, correlationId } = params;

    let user = await this.userRepository.findByEmailAndHostName(
      { emailAddress, hostName },
      { projection: { _id: 1, userId: 1, emailAddress: 1, cognitoUserId: 1, status: 1, role: 1, hostName: 1 } }
    );

    if (!user) {
      try {
        const cognitoUser = await executeWithTimeoutAndRetry(
          () => this.cognitoService.adminGetUser({
            emailAddress,
            hostName
          }),
          3000,
          0
        );

        logger.info('Cognito sync: user found in Cognito but not in MongoDB', { emailAddress });

        if (cognitoUser && cognitoUser.enabled) {
          user = await this.userRepository.create({
            emailAddress,
            cognitoUserId: cognitoUser.sub,
            hostName
          });
        }
      } catch (error) {
        logger.debug('Cognito sync skipped', { emailAddress, error: error.message });
        throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }
    }

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    console.log('🔐 [LOGIN] Generating OTP');
    const otp = this.otpCache.generateOtp();
    console.log('✅ [LOGIN] OTP generated:', otp);

    console.log('💾 [LOGIN] Storing OTP in Redis');
    await executeWithTimeoutAndRetry(
      () => this.otpCache.setLoginOtp({
        emailAddress,
        hostName,
        otp,
        expiresInSec: 300
      }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );
    console.log('✅ [LOGIN] OTP stored in Redis');

    console.log('📤 [LOGIN] Publishing OTP event to Kafka');
    this.kafkaPublisher.publishLoginOtpRequested({
      emailAddress,
      otp,
      hostName
    }).then(() => {
      console.log('✅ [LOGIN] Kafka event published successfully');
    }).catch(err => {
      console.error('❌ [LOGIN] Failed to publish Kafka event:', err.message);
      logger.error('Failed to publish login OTP event', { emailAddress, error: err.message });
    });

    return { message: 'Login OTP sent successfully' };
  }

  async verifyLoginOtp(params) {
    const { emailAddress, otp, hostName } = params;

    const otpData = await executeWithTimeoutAndRetry(
      () => this.otpCache.getLoginOtp({ emailAddress, hostName }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    if (!otpData) {
      throw new AppError(ERROR_MESSAGES.OTP_EXPIRED, ERROR_CODES.OTP_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }

    if (Date.now() > otpData.expiresAt) {
      throw new AppError(ERROR_MESSAGES.OTP_EXPIRED, ERROR_CODES.OTP_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }

    if (otpData.otp !== otp) {
      throw new AppError(ERROR_MESSAGES.INVALID_OTP, ERROR_CODES.INVALID_OTP, HTTP_STATUS.BAD_REQUEST);
    }

    const user = await this.userRepository.findByEmailAndHostName({ emailAddress, hostName });
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    await executeWithTimeoutAndRetry(
      () => this.otpCache.deleteLoginOtp({ emailAddress, hostName }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    const accessToken = this.jwtUtil.generateAccessToken({ user });
    const refreshToken = this.jwtUtil.generateRefreshToken({ user });

    await executeWithTimeoutAndRetry(
      () => this.userCache.setRefreshToken({
        userId: user.userId,
        refreshToken
      }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    logger.info('Login verified', { userId: user.userId, emailAddress });

    return {
      message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
      accessToken,
      refreshToken,
      user: {
        userId: user.userId,
        emailAddress: user.emailAddress,
        role: user.role,
        hostName: user.hostName,
        status: user.status
      }
    };
  }

  async refreshToken(params) {
    const { refreshToken } = params;

    const decoded = this.jwtUtil.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, ERROR_CODES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
    }

    const cachedToken = await executeWithTimeoutAndRetry(
      () => this.userCache.getRefreshToken({ userId: decoded.userId }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    if (cachedToken !== refreshToken) {
      throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, ERROR_CODES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
    }

    const user = await this.userRepository.findByUserId(decoded.userId, {
      projection: { _id: 1, userId: 1, emailAddress: 1, role: 1, hostName: 1, status: 1 }
    });
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const newAccessToken = this.jwtUtil.generateAccessToken({ user });

    return {
      message: SUCCESS_MESSAGES.TOKEN_REFRESHED,
      accessToken: newAccessToken,
      user: {
        userId: user.userId,
        emailAddress: user.emailAddress,
        role: user.role,
        hostName: user.hostName,
        status: user.status
      }
    };
  }

  async resendLoginOtp(params) {
    const { emailAddress, hostName } = params;

    const user = await this.userRepository.findByEmailAndHostName(
      { emailAddress, hostName },
      { projection: { _id: 1, userId: 1 } }
    );
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const existingOtp = await executeWithTimeoutAndRetry(
      () => this.otpCache.getLoginOtp({ emailAddress, hostName }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    if (existingOtp) {
      throw new AppError('OTP already sent. Please wait before requesting again.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }

    const otp = this.otpCache.generateOtp();

    await executeWithTimeoutAndRetry(
      () => this.otpCache.setLoginOtp({
        emailAddress,
        hostName,
        otp,
        expiresInSec: this.config.registration.otpExpiryTimeSec
      }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    this.kafkaPublisher.publishLoginOtpRequested({
      emailAddress,
      otp,
      hostName
    }).catch(err => logger.error('Failed to publish resend login OTP event', { emailAddress, error: err.message }));

    return {
      message: 'OTP resent successfully',
      expiresIn: this.config.registration.otpExpiryTimeSec
    };
  }
}

module.exports = AuthService;

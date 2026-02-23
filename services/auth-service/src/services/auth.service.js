const AppError = require('../utils/app-error');
const { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS, USER_STATUS, SUCCESS_MESSAGES, TIMEOUT_CONFIG } = require('../constants/auth.constants');
const { executeWithTimeoutAndRetry } = require('../utils/timeoutRetry.util');
const workspaceAccessRepository = require('../repositories/workspaceAccess.repository');

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
    const { email, userName, companyName, hostName, tenant } = params;

    const domain = (email.split('@')[1] || '').toLowerCase();
    if (this.config.registration.suppressedDomains.includes(domain)) {
      throw new AppError(ERROR_MESSAGES.DOMAIN_SUPPRESSED, ERROR_CODES.DOMAIN_SUPPRESSED, HTTP_STATUS.BAD_REQUEST);
    }

    // Check if user exists in MongoDB
    const existingUser = await this.userRepository.findByEmailAndTenant({ email, tenantId: tenant.tenantId });
    if (existingUser) {
      throw new AppError(ERROR_MESSAGES.USER_EXISTS, ERROR_CODES.USER_EXISTS, HTTP_STATUS.CONFLICT);
    }

    // Create user in MongoDB with PENDING status
    const user = await this.userRepository.create({
      email,
      userName,
      companyName,
      hostName,
      tenantId: tenant.tenantId,
      cognitoSubId: null,
      emailConfirmed: false,
      status: 'PENDING',
      lastLoginAt: null
    });

    // Create user in Cognito (UNCONFIRMED, email_verified=false)
    const cognitoUser = await executeWithTimeoutAndRetry(
      () => this.cognitoService.adminCreateUser({
        email,
        userName,
        cognitoUserPoolId: tenant.cognitoUserPoolId
      }),
      TIMEOUT_CONFIG.COGNITO_TIMEOUT_MS,
      TIMEOUT_CONFIG.COGNITO_RETRY_COUNT
    );

    // Update user with cognitoSubId
    await this.userRepository.updateCognitoSubId({
      userId: user._id,
      cognitoSubId: cognitoUser.sub
    });

    // Generate OTP (backend-controlled)
    const otp = this.otpCache.generateOtp();
    
    await executeWithTimeoutAndRetry(
      () => this.otpCache.setRegistrationOtp({
        userId: user._id.toString(),
        hostName,
        email,
        otp,
        expiresInSec: this.config.registration.otpExpiryTimeSec
      }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    // Send OTP via SES
    await this.kafkaPublisher.publishUserRegistrationOtpSend({
      user,
      otp,
      tenant,
      hostName,
      correlationId: params.correlationId
    });

    return {
      message: SUCCESS_MESSAGES.OTP_SENT,
      userId: user._id.toString()
    };
  }

  async registerVerify(params) {
    const { email, otp, hostName, tenant } = params;

    const user = await this.userRepository.findByEmailAndTenant({ email, tenantId: tenant.tenantId });
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Validate OTP from backend
    const otpData = await executeWithTimeoutAndRetry(
      () => this.otpCache.getRegistrationOtp({
        userId: user._id.toString(),
        hostName
      }),
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

    // Confirm user in Cognito using AdminConfirmSignUp
    await executeWithTimeoutAndRetry(
      () => this.cognitoService.adminConfirmSignUp({
        email,
        cognitoUserPoolId: tenant.cognitoUserPoolId
      }),
      TIMEOUT_CONFIG.COGNITO_TIMEOUT_MS,
      TIMEOUT_CONFIG.COGNITO_RETRY_COUNT
    );

    // Update MongoDB user status
    const updatedUser = await this.userRepository.confirmRegistration({
      userId: user._id,
      emailConfirmed: true,
      status: 'ACTIVE'
    });

    await executeWithTimeoutAndRetry(
      () => this.otpCache.deleteRegistrationOtp({
        userId: user._id.toString(),
        hostName
      }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    // Add user to SYSTEM_WORKSPACE with FREE_USER role (idempotent)
    await workspaceAccessRepository.assignSystemWorkspaceRole(updatedUser._id);

    await this.kafkaPublisher.publishUserRegistrationWelcomeEmail({
      user: updatedUser,
      hostName,
      tenant,
      correlationId: params.correlationId
    });

    const { getSystemWorkspace } = require('../scripts/bootstrap-system-workspace');
    const systemWorkspace = await getSystemWorkspace();

    return {
      message: SUCCESS_MESSAGES.EMAIL_VERIFIED,
      user: updatedUser.toJSON(),
      trial: {
        workspaceId: systemWorkspace._id,
        role: 'FREE_USER'
      }
    };
  }

  async resendRegistrationOtp(params) {
    const { email, tenant } = params;

    const user = await this.userRepository.findByEmailAndTenant({ email, tenantId: tenant.tenantId });
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.isVerified) {
      throw new AppError('User already verified', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }

    const existingOtp = await executeWithTimeoutAndRetry(
      () => this.otpCache.getRegistrationOtp({
        userId: user._id.toString(),
        hostName: user.hostName
      }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    if (existingOtp) {
      throw new AppError('OTP already sent. Please wait before requesting again.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }

    const otp = this.otpCache.generateOtp();
    
    await executeWithTimeoutAndRetry(
      () => this.otpCache.setRegistrationOtp({
        userId: user._id.toString(),
        hostName: user.hostName,
        email,
        otp,
        expiresInSec: this.config.registration.otpExpiryTimeSec
      }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    await this.kafkaPublisher.publishUserRegistrationOtpSend({
      user,
      otp,
      tenant,
      hostName: user.hostName,
      correlationId: params.correlationId
    });

    return {
      message: 'OTP resent successfully'
    };
  }

  async login(params) {
    const { email, tenant } = params;
    const { tenantId } = tenant;

    // Check if user exists in MongoDB
    let user = await this.userRepository.findByEmailAndTenant({ email, tenantId });

    // If not found, try Cognito sync (optional - skip if Cognito unavailable)
    if (!user) {
      try {
        const cognitoUser = await executeWithTimeoutAndRetry(
          () => this.cognitoService.adminGetUser({
            email,
            cognitoUserPoolId: tenant.cognitoUserPoolId
          }),
          3000, // 3 second timeout
          0 // No retries
        );

        console.log(
          "[Cognito Sync] User found in Cognito but not in MongoDB. Syncing user...",
          cognitoUser,
        );

        if (cognitoUser && cognitoUser.enabled) {
          // Create MongoDB user record
          user = await this.userRepository.create({
            email,
            cognitoSubId: cognitoUser.sub,
            tenantId,
            emailConfirmed: true,
            status: 'ACTIVE'
          });

          // Assign SYSTEM_WORKSPACE FREE_USER role (idempotent)
          await workspaceAccessRepository.assignSystemWorkspaceRole(user._id);
        }
      } catch (error) {
        console.log('[AUTH] Cognito sync skipped:', error.message);
        // User not found in MongoDB or Cognito
        throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }
    }

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Generate 6 digit OTP
    const otp = this.otpCache.generateOtp();
    
    // Store OTP in Redis
    await executeWithTimeoutAndRetry(
      () => this.otpCache.setLoginOtp({
        email,
        tenantId,
        otp,
        expiresInSec: 300
      }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    // Publish Kafka event
    await this.kafkaPublisher.publishLoginOtpRequested({
      email,
      otp,
      tenant
    });

    return {
      message: 'Login OTP sent successfully'
    };
  }

  async verifyLoginOtp(params) {
    const { email, otp, tenant } = params;
    const { tenantId } = tenant;

    const otpData = await executeWithTimeoutAndRetry(
      () => this.otpCache.getLoginOtp({ email, tenantId }),
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

    const user = await this.userRepository.findByEmailAndTenant({ email, tenantId });
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    await executeWithTimeoutAndRetry(
      () => this.otpCache.deleteLoginOtp({ email, tenantId }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    // Update lastLoginAt
    await this.userRepository.updateLastLogin({ userId: user._id });

    const accessToken = this.jwtUtil.generateAccessToken({ user });
    const refreshToken = this.jwtUtil.generateRefreshToken({ user });

    await executeWithTimeoutAndRetry(
      () => this.userCache.setRefreshToken({
        userId: user._id.toString(),
        refreshToken
      }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    return {
      message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
      accessToken,
      refreshToken,
      user: user.toJSON()
    };
  }

  async refreshToken(params) {
    const { refreshToken } = params;

    const decoded = this.jwtUtil.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, ERROR_CODES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
    }

    const cachedToken = await executeWithTimeoutAndRetry(
      () => this.userCache.getRefreshToken({
        userId: decoded.userId
      }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    if (cachedToken !== refreshToken) {
      throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, ERROR_CODES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
    }

    const user = await this.userRepository.findById({ userId: decoded.userId });
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const newAccessToken = this.jwtUtil.generateAccessToken({ user });

    return {
      message: SUCCESS_MESSAGES.TOKEN_REFRESHED,
      accessToken: newAccessToken,
      user: user.toJSON()
    };
  }

  async resendLoginOtp(params) {
    const { email, tenant } = params;
    const { tenantId } = tenant;

    const user = await this.userRepository.findByEmailAndTenant({ email, tenantId });
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const existingOtp = await executeWithTimeoutAndRetry(
      () => this.otpCache.getLoginOtp({ email, tenantId }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    if (existingOtp) {
      throw new AppError('OTP already sent. Please wait before requesting again.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }

    const otp = this.otpCache.generateOtp();
    
    await executeWithTimeoutAndRetry(
      () => this.otpCache.setLoginOtp({
        email,
        tenantId,
        otp,
        expiresInSec: this.config.registration.otpExpiryTimeSec
      }),
      TIMEOUT_CONFIG.REDIS_TIMEOUT_MS,
      TIMEOUT_CONFIG.REDIS_RETRY_COUNT
    );

    await this.kafkaPublisher.publishLoginOtpRequested({
      email,
      otp,
      tenant
    });

    return {
      message: 'OTP resent successfully',
      expiresIn: this.config.registration.otpExpiryTimeSec
    };
  }
}

module.exports = AuthService;

'use strict';

const AppError = require('../utils/app-error');
const { verifyAccessToken } = require('../utils/jwt.util');
const { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } = require('../constants/auth.constants');
const RedisService = require('../services/redis.service');
const logger = require('../utils/logger');

const authenticateSession = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Authentication required', ERROR_CODES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyAccessToken(token);

        if (!decoded || !decoded.sessionKey) {
            throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, ERROR_CODES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
        }

        const sessionKey = decoded.sessionKey;

        // Check Blocked Session
        const isBlocked = await RedisService.isSessionBlocked(sessionKey);
        if (isBlocked) {
            throw new AppError('Session has been terminated', ERROR_CODES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
        }

        // Check Redis Active Session
        const session = await RedisService.getSession(sessionKey);
        if (!session) {
            throw new AppError('Session expired or invalid', ERROR_CODES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
        }

        // Attach user/session to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            workspaceId: decoded.workspaceId,
            sessionKey: decoded.sessionKey
        };

        next();
    } catch (error) {
        logger.error('Authentication failed', { error: error.message });
        next(error);
    }
};

module.exports = { authenticateSession };

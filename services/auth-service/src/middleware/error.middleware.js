'use strict';

const AppError = require('../utils/app-error');
const logger = require('../utils/logger');
const { sendError } = require('../utils/response.util');

function errorMiddleware(err, req, res, next) {
  const correlationId = req.correlationId;
  const tenantId = req.tenant?.tenantId;
  const hostname = req.hostname;

  // Log error with context
  logger.error('Request error', {
    correlationId,
    tenantId,
    hostname,
    error: err.message,
    code: err.code,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {})
  });

  // Handle AppError
  if (err instanceof AppError) {
    return sendError(res, {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      correlationId
    });
  }

  // Handle Cognito errors
  if (err.name === 'NotAuthorizedException' || err.name === 'UserNotFoundException') {
    return sendError(res, {
      code: 'AUTH_001',
      message: 'Invalid credentials',
      statusCode: 401,
      correlationId
    });
  }

  if (err.name === 'UsernameExistsException') {
    return sendError(res, {
      code: 'AUTH_002',
      message: 'User already exists',
      statusCode: 409,
      correlationId
    });
  }

  // Handle MongoDB errors
  if (err.name === 'MongoError' && err.code === 11000) {
    return sendError(res, {
      code: 'DB_001',
      message: 'Duplicate entry',
      statusCode: 409,
      correlationId
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return sendError(res, {
      code: 'VALIDATION_001',
      message: err.message,
      statusCode: 400,
      correlationId
    });
  }

  // Handle unknown errors
  return sendError(res, {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
    correlationId
  });
}

module.exports = errorMiddleware;

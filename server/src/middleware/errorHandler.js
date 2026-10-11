import logger from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';
import config from '../config/index.js';

/**
 * Centralized error handling middleware.
 * Must be registered after all routes (4-argument signature required by Express).
 */

export function errorHandler(err, _req, res, _next) {
  // Default to 500
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return res.status(statusCode).json({
      success: false,
      error: { code, message, details },
    });
  }

  // Prisma known request errors
  if (err.code === 'P2002') {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'A record with this value already exists';
  }

  if (err.code === 'P2025') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Record not found';
  }

  // Log error (operational errors at warn, unexpected at error)
  if (err instanceof AppError && err.isOperational) {
    logger.warn({ err, statusCode }, `Operational error: ${message}`);
  } else {
    logger.error({ err, statusCode }, `Unexpected error: ${message}`);
  }

  // Don't expose internal details in production
  if (config.isProd && statusCode === 500) {
    message = 'An unexpected error occurred';
  }

  const response = {
    success: false,
    error: {
      code,
      message,
      ...(err.details && { details: err.details }),
    },
  };

  res.status(statusCode).json(response);
}

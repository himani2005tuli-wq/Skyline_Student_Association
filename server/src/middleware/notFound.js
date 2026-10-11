import { NotFoundError } from '../utils/AppError.js';

/**
 * 404 handler for unmatched routes.
 * Must be registered after all route handlers.
 */
export function notFoundHandler(_req, _res, next) {
  next(new NotFoundError('The requested resource was not found'));
}

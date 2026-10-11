import pinoHttp from 'pino-http';
import logger from '../utils/logger.js';

/**
 * HTTP request/response logging middleware using pino-http.
 * Redacts sensitive headers automatically via the base logger config.
 */
export const requestLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => {
      // Don't log health checks in production to avoid noise
      return req.url === '/api/v1/health';
    },
  },
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        // Don't serialize body or cookies
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});

import pino from 'pino';
import config from '../config/index.js';

const logger = pino({
  level: config.log.level,
  ...(config.isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  ...(config.isProd && {
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }),
  // Never log sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'sessionId',
      'resetToken',
      'secret',
      '*.password',
      '*.passwordHash',
      '*.sessionId',
      '*.resetToken',
      '*.secret',
    ],
    remove: true,
  },
});

export default logger;

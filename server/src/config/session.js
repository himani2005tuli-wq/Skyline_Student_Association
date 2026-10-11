import session from 'express-session';
import { RedisStore } from 'connect-redis';
import config from './index.js';
import logger from '../utils/logger.js';

let store;

if (config.redis.enabled) {
  try {
    // Dynamic import to avoid crash if ioredis fails to load
    const { default: Redis } = await import('ioredis');
    const isUpstash = config.redis.url.includes('upstash.io');
    const isTls = config.redis.url.startsWith('rediss://') || isUpstash;
    const redisClient = new Redis(config.redis.url, {
      ...(isTls && { tls: { rejectUnauthorized: false } }),
      family: 0,
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis session store error');
    });

    store = new RedisStore({
      client: redisClient,
      prefix: 'sos:sess:',
    });

    logger.info('Redis session store initialized');
  } catch (error) {
    logger.error(
      { err: error },
      'Failed to initialize Redis session store, falling back to MemoryStore',
    );
    store = new session.MemoryStore();
  }
} else {
  logger.info('Redis disabled, using MemoryStore for sessions (development only)');
  store = new session.MemoryStore();
}

export const sessionMiddleware = session({
  store,
  secret: config.session.secret,
  name: 'sos_sid',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    maxAge: config.session.maxAge,
    secure: config.isProd, // HTTPS only in production
    httpOnly: true,
    sameSite: process.env.SESSION_COOKIE_SAMESITE || (config.isProd ? 'none' : 'lax'),
  },
});

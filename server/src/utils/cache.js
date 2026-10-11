import Redis from 'ioredis';
import config from '../config/index.js';
import logger from './logger.js';

let redisClient = null;
const memoryStore = new Map();

if (config.redis.enabled) {
  try {
    const isUpstash = config.redis.url.includes('upstash.io');
    const isTls = config.redis.url.startsWith('rediss://') || isUpstash;
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 1,
      lazyConnect: false,
      ...(isTls && { tls: { rejectUnauthorized: false } }),
      family: 0,
    });

    redisClient.on('error', (err) => {
      logger.debug({ err: err.message }, 'Redis cache connection error, falling back to in-memory');
    });

    redisClient.on('connect', () => {
      logger.info('⚡ Redis Cache Engine connected successfully');
    });
  } catch (err) {
    logger.warn({ err: err.message }, 'Could not initialize Redis client, using in-memory cache');
  }
}

/**
 * Get value from Redis or in-memory fallback
 */
export async function getCache(key) {
  try {
    if (redisClient && redisClient.status === 'ready') {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    }
  } catch {
    // fallback
  }

  const mem = memoryStore.get(key);
  if (mem) {
    if (Date.now() < mem.expiresAt) {
      return mem.value;
    }
    memoryStore.delete(key);
  }
  return null;
}

/**
 * Set value in Redis or in-memory fallback
 */
export async function setCache(key, value, ttlSeconds = 60) {
  try {
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return;
    }
  } catch {
    // fallback
  }

  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Invalidate cache by key or prefix tag
 */
export async function invalidateCache(tag) {
  try {
    if (redisClient && redisClient.status === 'ready') {
      const keys = await redisClient.keys(`sos:cache:${tag}*`);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    }
  } catch {
    // fallback
  }

  for (const key of memoryStore.keys()) {
    if (key.includes(tag)) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Express Middleware for sub-millisecond API response caching
 */
export function cacheMiddleware(tag, ttlSeconds = 60) {
  return async (req, res, next) => {
    // Only cache unauthenticated GET requests to avoid leaking or caching user/role-scoped data
    if (req.method !== 'GET' || req.headers.authorization || req.session?.userId) {
      return next();
    }

    const cacheKey = `sos:cache:${tag}:${req.originalUrl}`;

    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Response-Time-Source', 'Cache');
        return res.json(cached);
      }
    } catch {
      // continue on cache read failure
    }

    // Intercept res.json to store in cache
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setCache(cacheKey, body, ttlSeconds).catch(() => {});
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

export const cacheGet = getCache;
export const cacheSet = setCache;

export default {
  getCache,
  setCache,
  cacheGet,
  cacheSet,
  invalidateCache,
  cacheMiddleware,
};

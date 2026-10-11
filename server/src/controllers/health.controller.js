import prisma from '../config/database.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Health check controller.
 * GET /api/v1/health — public basic check
 * GET /api/v1/health/detailed — super admin detailed check
 */
export async function getHealth(_req, res) {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.env,
      version: process.env.npm_package_version || '0.1.0',
    },
  });
}

export async function getDetailedHealth(_req, res) {
  const checks = {
    database: 'unknown',
    redis: 'unknown',
  };

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'connected';
  } catch (err) {
    logger.error({ err }, 'Database health check failed');
    checks.database = 'disconnected';
  }

  // Redis check (only if enabled)
  if (config.redis.enabled) {
    try {
      const { default: Redis } = await import('ioredis');
      const isUpstash = config.redis.url.includes('upstash.io');
      const isTls = config.redis.url.startsWith('rediss://') || isUpstash;
      const redis = new Redis(config.redis.url, { 
        lazyConnect: true, 
        connectTimeout: 3000,
        ...(isTls && { tls: { rejectUnauthorized: false } }),
        family: 0,
      });
      await redis.ping();
      checks.redis = 'connected';
      await redis.quit();
    } catch (err) {
      logger.error({ err }, 'Redis health check failed');
      checks.redis = 'disconnected';
    }
  } else {
    checks.redis = 'disabled';
  }

  const allHealthy =
    checks.database === 'connected' &&
    (checks.redis === 'connected' || checks.redis === 'disabled');

  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    data: {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: config.env,
      uptime: Math.floor(process.uptime()),
      checks,
    },
  });
}

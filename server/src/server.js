import { createServer } from 'node:http';
import app from './app.js';
import config from './config/index.js';
import logger from './utils/logger.js';
import prisma from './config/database.js';
import authorityService from './services/authority.service.js';
import cronService from './services/cron.service.js';
import socketService from './services/socket.service.js';

const PORT = config.port;

async function start() {
  try {
    // Verify database connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Ensure dynamic role authorities are initialized in DB
    await authorityService.ensureRoleAuthorities();

    // Start background notification cron scheduler
    cronService.startCronScheduler();

    // Create HTTP & WebSocket server
    const httpServer = createServer(app);
    socketService.init(httpServer);

    const server = httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${config.env} mode`);
      logger.info(`📋 Health check: http://localhost:${PORT}/api/v1/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      cronService.stopCronScheduler();
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Database disconnected');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('unhandledRejection', (reason) => {
      logger.error({ err: reason }, 'Unhandled promise rejection');
    });

    process.on('uncaughtException', (err) => {
      logger.fatal({ err }, 'Uncaught exception');
      process.exit(1);
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();

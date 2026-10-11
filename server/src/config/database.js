import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

prisma.$on('error', (e) => {
  if (e.message?.includes('kind: Closed')) {
    logger.debug(
      { err: e },
      'Prisma idle pool connection closed by remote pooler; will reconnect automatically',
    );
    return;
  }
  logger.error({ err: e }, 'Prisma error');
});

prisma.$on('warn', (e) => {
  logger.warn({ err: e }, 'Prisma warning');
});

export default prisma;

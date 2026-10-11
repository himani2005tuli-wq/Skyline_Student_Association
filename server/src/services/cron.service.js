import cron from 'node-cron';
import prisma from '../config/database.js';
import communicationService from './communication.service.js';
import logger from '../utils/logger.js';

let activeCronJob = null;
let isJobRunning = false;

/**
 * Process scheduled notifications whose scheduled time has arrived
 */
export async function runScheduledNotificationCron() {
  if (isJobRunning) {
    logger.debug('Scheduled notification cron is already running, skipping overlapping tick');
    return { processed: 0 };
  }

  isJobRunning = true;
  const now = new Date();

  try {
    // Find all announcements that are scheduled and ready to be dispatched
    const pendingAnnouncements = await prisma.announcement.findMany({
      where: {
        isPublished: false,
        scheduledFor: {
          not: null,
          lte: now,
        },
      },
    });

    if (pendingAnnouncements.length === 0) {
      return { processed: 0 };
    }

    logger.info(
      { count: pendingAnnouncements.length },
      '⏰ [CRON] Found scheduled notifications ready for dispatch',
    );

    let processedCount = 0;
    for (const item of pendingAnnouncements) {
      try {
        await communicationService.dispatchAnnouncement(item.id);
        processedCount++;
        logger.info(
          { announcementId: item.id, title: item.title },
          '✅ [CRON] Successfully dispatched scheduled announcement',
        );
      } catch (err) {
        logger.error(
          { announcementId: item.id, err: err.message },
          '❌ [CRON] Failed to dispatch scheduled announcement',
        );
      }
    }

    return { processed: processedCount };
  } catch (err) {
    logger.error({ err: err.message }, '❌ [CRON] Error checking scheduled notifications');
    return { processed: 0, error: err.message };
  } finally {
    isJobRunning = false;
  }
}

/**
 * Start the background notification cron scheduler
 * Default interval: Every minute ('* * * * *')
 */
export function startCronScheduler(expression = '* * * * *') {
  if (activeCronJob) {
    logger.info('Notification cron scheduler is already running');
    return activeCronJob;
  }

  if (!cron.validate(expression)) {
    throw new Error(`Invalid cron expression: "${expression}"`);
  }

  activeCronJob = cron.schedule(expression, async () => {
    logger.debug('⏰ [CRON TICK] Checking scheduled notifications');
    await runScheduledNotificationCron();
  });

  logger.info({ expression }, '🚀 Notification Cron Scheduler started successfully');
  return activeCronJob;
}

/**
 * Stop the background cron scheduler
 */
export function stopCronScheduler() {
  if (activeCronJob) {
    activeCronJob.stop();
    activeCronJob = null;
    logger.info('Notification Cron Scheduler stopped');
  }
}

/**
 * Get current cron status and pending jobs count
 */
export async function getCronStatus() {
  const pendingCount = await prisma.announcement.count({
    where: {
      isPublished: false,
      scheduledFor: { not: null },
    },
  });

  return {
    isRunning: Boolean(activeCronJob),
    expression: '* * * * *',
    pendingScheduledCount: pendingCount,
    serverTime: new Date().toISOString(),
  };
}

export default {
  startCronScheduler,
  stopCronScheduler,
  runScheduledNotificationCron,
  getCronStatus,
};

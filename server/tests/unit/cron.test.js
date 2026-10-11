import { describe, it, expect } from 'vitest';
import cronService from '../../src/services/cron.service.js';

describe('Cron Notification Scheduling Service', () => {
  it('starts and manages background cron lifecycle', async () => {
    const job = cronService.startCronScheduler('* * * * *');
    expect(job).toBeDefined();

    const status = await cronService.getCronStatus();
    expect(status.isRunning).toBe(true);
    expect(status.expression).toBe('* * * * *');
    expect(typeof status.pendingScheduledCount).toBe('number');

    cronService.stopCronScheduler();
    const stoppedStatus = await cronService.getCronStatus();
    expect(stoppedStatus.isRunning).toBe(false);
  });

  it('runs cron tick smoothly without unhandled errors', async () => {
    const result = await cronService.runScheduledNotificationCron();
    expect(result).toBeDefined();
    expect(typeof result.processed).toBe('number');
  });
});

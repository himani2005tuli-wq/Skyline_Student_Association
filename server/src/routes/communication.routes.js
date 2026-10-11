import { Router } from 'express';
import {
  createAnnouncement,
  getAnnouncements,
  getScheduledAnnouncements,
  cancelScheduledAnnouncement,
  deleteAnnouncement,
  triggerScheduledCron,
  getCronStatus,
  pushDirectNotification,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updateMyPreferences,
  getMyPreferences,
} from '../controllers/communication.controller.js';
import { requireAuth, requireAnyAuthority, optionalAuth } from '../middleware/auth.js';
import { csrfSynchronisedProtection } from '../middleware/csrf.js';

import { cacheMiddleware, invalidateCache } from '../utils/cache.js';

const router = Router();

// ─── Public routes (cached in Redis / memory for fast response, auth-aware) ───────────────────────
router.get('/announcements', optionalAuth, cacheMiddleware('announcements', 60), getAnnouncements);

// ─── Member authenticated routes ──────────────────────────
router.get('/preferences/me', requireAuth, getMyPreferences);
router.post('/preferences/me', requireAuth, csrfSynchronisedProtection, updateMyPreferences);

// User In-App Notification Inbox
router.get('/notifications/me', requireAuth, getMyNotifications);
router.patch(
  '/notifications/:id/read',
  requireAuth,
  csrfSynchronisedProtection,
  markNotificationRead,
);
router.patch(
  '/notifications/read-all',
  requireAuth,
  csrfSynchronisedProtection,
  markAllNotificationsRead,
);

// ─── Admin / Authority management routes ───────────────────
// Create announcement (immediate or scheduled with cron, invalidates cache)
router.post(
  '/announcements',
  requireAuth,
  requireAnyAuthority(['announcements:publish', '*']),
  csrfSynchronisedProtection,
  async (req, res, next) => {
    await invalidateCache('announcements');
    next();
  },
  createAnnouncement,
);

// Inspect scheduled notifications in queue
router.get(
  '/scheduled',
  requireAuth,
  requireAnyAuthority(['announcements:publish', '*']),
  getScheduledAnnouncements,
);

// Cancel a scheduled announcement
router.delete(
  '/scheduled/:id',
  requireAuth,
  requireAnyAuthority(['announcements:publish', '*']),
  csrfSynchronisedProtection,
  cancelScheduledAnnouncement,
);

// Delete a published or existing announcement
router.delete(
  '/announcements/:id',
  requireAuth,
  requireAnyAuthority(['announcements:publish', '*']),
  csrfSynchronisedProtection,
  async (req, res, next) => {
    await invalidateCache('announcements');
    next();
  },
  deleteAnnouncement,
);

// Trigger cron processing immediately on demand
router.post(
  '/scheduled/trigger',
  requireAuth,
  requireAnyAuthority(['announcements:publish', '*']),
  csrfSynchronisedProtection,
  triggerScheduledCron,
);

// Inspect cron scheduler status
router.get(
  '/cron/status',
  requireAuth,
  requireAnyAuthority(['announcements:publish', '*']),
  getCronStatus,
);

// Direct In-App push notification dispatch
router.post(
  '/notifications/push',
  requireAuth,
  requireAnyAuthority(['announcements:publish', 'events:manage', '*']),
  csrfSynchronisedProtection,
  pushDirectNotification,
);

export default router;

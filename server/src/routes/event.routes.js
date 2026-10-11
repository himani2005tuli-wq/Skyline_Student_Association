import { Router } from 'express';
import { listEvents, getEvent, createEvent, deleteEvent } from '../controllers/event.controller.js';
import { requireAuth, requireRoles, optionalAuth } from '../middleware/auth.js';
import { csrfSynchronisedProtection } from '../middleware/csrf.js';

import { cacheMiddleware, invalidateCache } from '../utils/cache.js';

const router = Router();

// Public routes (cached in Redis / memory for <3ms response time, auth-aware)
router.get('/', optionalAuth, cacheMiddleware('events', 120), listEvents);
router.get('/:id', cacheMiddleware('events', 120), getEvent);

// Admin routes (invalidates events cache on creation/deletion)
router.post(
  '/',
  requireAuth,
  requireRoles(['CLUB_ADMIN', 'EVENT_MANAGER', 'SUPER_ADMIN']),
  csrfSynchronisedProtection,
  async (req, res, next) => {
    await invalidateCache('events');
    next();
  },
  createEvent,
);

router.delete(
  '/:id',
  requireAuth,
  requireRoles(['CLUB_ADMIN', 'EVENT_MANAGER', 'SUPER_ADMIN']),
  csrfSynchronisedProtection,
  async (req, res, next) => {
    await invalidateCache('events');
    next();
  },
  deleteEvent,
);

export default router;

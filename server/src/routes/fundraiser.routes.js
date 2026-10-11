import { Router } from 'express';
import {
  listFundraisers,
  createFundraiser,
  createVolunteerTask,
  assignTask,
  updateTaskStatus,
  listVolunteerTasks,
  listVolunteers,
} from '../controllers/fundraiser.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { csrfSynchronisedProtection } from '../middleware/csrf.js';

import { cacheMiddleware, invalidateCache } from '../utils/cache.js';

const router = Router();

// Volunteer roster and tasks endpoints
router.get('/tasks', requireAuth, listVolunteerTasks);
router.get(
  '/volunteers',
  requireAuth,
  requireRoles(['CLUB_ADMIN', 'EVENT_MANAGER', 'SUPER_ADMIN']),
  listVolunteers,
);

// Public / Member routes (cached in Redis / memory for <3ms response)
router.get('/', cacheMiddleware('fundraisers', 120), listFundraisers);

// Admin / Event Manager routes for creating (invalidates fundraiser cache)
router.post(
  '/',
  requireAuth,
  requireRoles(['CLUB_ADMIN', 'EVENT_MANAGER', 'SUPER_ADMIN']),
  csrfSynchronisedProtection,
  async (req, res, next) => {
    await invalidateCache('fundraisers');
    next();
  },
  createFundraiser,
);
router.post(
  '/:fundraiserId/tasks',
  requireAuth,
  requireRoles(['CLUB_ADMIN', 'EVENT_MANAGER', 'SUPER_ADMIN']),
  csrfSynchronisedProtection,
  async (req, res, next) => {
    await invalidateCache('fundraisers');
    next();
  },
  createVolunteerTask,
);

// Volunteer task actions
router.post(
  '/tasks/:taskId/assign',
  requireAuth,
  csrfSynchronisedProtection,
  async (req, res, next) => {
    await invalidateCache('fundraisers');
    next();
  },
  assignTask,
);
router.patch(
  '/tasks/:taskId/status',
  requireAuth,
  csrfSynchronisedProtection,
  async (req, res, next) => {
    await invalidateCache('fundraisers');
    next();
  },
  updateTaskStatus,
);

export default router;

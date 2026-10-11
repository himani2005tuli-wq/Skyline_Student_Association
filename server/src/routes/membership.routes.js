import { Router } from 'express';
import {
  getPlans,
  getMyStatus,
  initiateSubscription,
} from '../controllers/membership.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { csrfSynchronisedProtection } from '../middleware/csrf.js';

import { cacheMiddleware } from '../utils/cache.js';

const router = Router();

// Publicly viewable plans across all clubs
router.get('/plans', getPlans);

// Protected routes
router.get('/me', requireAuth, getMyStatus);
router.post('/subscribe', requireAuth, csrfSynchronisedProtection, initiateSubscription);

export default router;

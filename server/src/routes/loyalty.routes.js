import { Router } from 'express';
import { getMyBalance, simulateEarn } from '../controllers/loyalty.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { csrfSynchronisedProtection } from '../middleware/csrf.js';

const router = Router();

// User viewing their own balance
router.get('/me', requireAuth, getMyBalance);

// Admin-only simulation endpoint
router.post(
  '/simulate-earn',
  requireAuth,
  requireRoles(['CLUB_ADMIN']),
  csrfSynchronisedProtection,
  simulateEarn,
);

export default router;

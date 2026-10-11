import { Router } from 'express';
import {
  bookTickets,
  simulatePaymentWebhook,
  getMyTickets,
} from '../controllers/ticket.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { csrfSynchronisedProtection } from '../middleware/csrf.js';

const router = Router();

// Current user tickets
router.get('/me', requireAuth, getMyTickets);

// User ticket booking
router.post('/book', requireAuth, csrfSynchronisedProtection, bookTickets);

// Webhook simulation (Admin only for safety in this mock environment)
router.post(
  '/simulate-webhook',
  requireAuth,
  requireRoles(['CLUB_ADMIN']),
  csrfSynchronisedProtection,
  simulatePaymentWebhook,
);

export default router;

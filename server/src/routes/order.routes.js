import { Router } from 'express';
import {
  createOrder,
  simulateOrderPaymentWebhook,
  cancelOrder,
  getMyOrders,
} from '../controllers/order.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { csrfSynchronisedProtection } from '../middleware/csrf.js';

const router = Router();

// Current user orders
router.get('/me', requireAuth, getMyOrders);

// User checkout
router.post('/checkout', requireAuth, csrfSynchronisedProtection, createOrder);

// User/System cancels pending order
router.post('/cancel', requireAuth, csrfSynchronisedProtection, cancelOrder);

// Webhook simulation (Admin only)
router.post(
  '/simulate-webhook',
  requireAuth,
  requireRoles(['CLUB_ADMIN']),
  csrfSynchronisedProtection,
  simulateOrderPaymentWebhook,
);

export default router;

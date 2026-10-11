import { Router } from 'express';
import {
  getPaymentConfig,
  createPaymentOrder,
  verifyPayment,
  webhookHandler,
  mockConfirmPayment,
} from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { csrfSynchronisedProtection } from '../middleware/csrf.js';

const router = Router();

// Public payment configuration (tells client if Razorpay is configured & provides keyId)
router.get('/config', getPaymentConfig);

// Create order on Razorpay for tickets, merchandise, or membership plans
router.post('/create-order', requireAuth, csrfSynchronisedProtection, createPaymentOrder);

// Verify Razorpay payment signature and activate purchases
router.post('/verify', requireAuth, csrfSynchronisedProtection, verifyPayment);

// Webhook endpoint (unprotected by auth, verified via Razorpay HMAC signature)
router.post('/webhook', webhookHandler);

// Development/mock confirmation endpoint
router.post('/mock-confirm', requireAuth, csrfSynchronisedProtection, mockConfirmPayment);

export default router;

import { Router } from 'express';
import {
  submitExpense,
  getMyExpenses,
  listClubExpenses,
  reviewExpense,
  markExpenseAsPaid,
} from '../controllers/expense.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { csrfSynchronisedProtection } from '../middleware/csrf.js';

const router = Router();

// Member endpoints
router.get('/me', requireAuth, getMyExpenses);
router.post('/', requireAuth, csrfSynchronisedProtection, submitExpense);

// Admin / Treasurer endpoints
router.get(
  '/',
  requireAuth,
  requireRoles(['CLUB_ADMIN', 'TREASURER', 'SUPER_ADMIN']),
  listClubExpenses,
);
router.post(
  '/:id/review',
  requireAuth,
  requireRoles(['CLUB_ADMIN', 'TREASURER', 'SUPER_ADMIN']),
  csrfSynchronisedProtection,
  reviewExpense,
);
router.post(
  '/:id/pay',
  requireAuth,
  requireRoles(['TREASURER', 'SUPER_ADMIN']),
  csrfSynchronisedProtection,
  markExpenseAsPaid,
);

export default router;

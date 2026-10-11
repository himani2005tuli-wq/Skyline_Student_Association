import { Router } from 'express';
import { scanTicket, getAttendees } from '../controllers/checkin.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { csrfSynchronisedProtection } from '../middleware/csrf.js';

const router = Router();

// Only specific roles can scan tickets or view attendee lists at the door
router.post(
  '/scan',
  requireAuth,
  requireRoles(['CLUB_ADMIN', 'EVENT_MANAGER', 'VOLUNTEER']),
  csrfSynchronisedProtection,
  scanTicket,
);

router.get(
  '/attendees',
  requireAuth,
  requireRoles(['CLUB_ADMIN', 'EVENT_MANAGER', 'VOLUNTEER']),
  getAttendees,
);

export default router;

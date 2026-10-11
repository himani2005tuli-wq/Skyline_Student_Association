import { Router } from 'express';
import {
    listClubs,
    getClub,
    createClub,
    updateClub,
    deleteClub,
} from '../controllers/club.controller.js';
import { requireAuth, requireRoles, optionalAuth } from '../middleware/auth.js';
import { csrfSynchronisedProtection } from '../middleware/csrf.js';

const router = Router();

// Public routes for directory and club view (auth-aware)
router.get('/', optionalAuth, listClubs);
router.get('/:id', getClub);

// Restricted Club Admin & Super Admin operations
router.post(
    '/',
    requireAuth,
    requireRoles(['CLUB_ADMIN', 'SUPER_ADMIN']),
    csrfSynchronisedProtection,
    createClub,
);
router.put(
    '/:id',
    requireAuth,
    requireRoles(['CLUB_ADMIN', 'SUPER_ADMIN']),
    csrfSynchronisedProtection,
    updateClub,
);
router.delete(
    '/:id',
    requireAuth,
    requireRoles(['CLUB_ADMIN', 'SUPER_ADMIN']),
    csrfSynchronisedProtection,
    deleteClub,
);

export default router;



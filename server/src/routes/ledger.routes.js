import { Router } from 'express';
import { getClubLedger } from '../controllers/ledger.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, requireRoles(['TREASURER', 'SUPER_ADMIN']), getClubLedger);

export default router;

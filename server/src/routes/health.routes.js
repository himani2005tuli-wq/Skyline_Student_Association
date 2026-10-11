import { Router } from 'express';
import { getHealth, getDetailedHealth } from '../controllers/health.controller.js';

const router = Router();

// GET /api/v1/health — public
router.get('/', getHealth);

// GET /api/v1/health/detailed — will be restricted to SUPER_ADMIN in Phase 2
router.get('/detailed', getDetailedHealth);

export default router;

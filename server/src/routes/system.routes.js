import { Router } from 'express';
import {
  getSystemOverview,
  getSystemAuditLogs,
  clearSystemCache,
  triggerSystemCron,
} from '../controllers/system.controller.js';
import { requireAuth, requireAnyAuthority } from '../middleware/auth.js';
import { csrfSynchronisedProtection } from '../middleware/csrf.js';

const router = Router();

// All Super Admin system routes require authentication and Super Admin wildcard/system permissions
router.use(requireAuth);
router.use(requireAnyAuthority(['*', 'system:manage']));

// 1. Live Platform Overview & Infrastructure Telemetry
router.get('/overview', getSystemOverview);

// 2. Audit Trail & Activity Logs
router.get('/audit-logs', getSystemAuditLogs);

// 3. Clear System Cache
router.post('/cache/clear', csrfSynchronisedProtection, clearSystemCache);

// 4. Trigger Background Notification Cron
router.post('/cron/trigger', csrfSynchronisedProtection, triggerSystemCron);

export default router;

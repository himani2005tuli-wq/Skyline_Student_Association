import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, getMe, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { getCsrfToken, csrfSynchronisedProtection } from '../middleware/csrf.js';
import config from '../config/index.js';

const router = Router();

const isDev = process.env.NODE_ENV !== 'production';

// ─── Brute-force protection for login ─────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : (config.security.loginRateLimitMax || 20),
  skipSuccessfulRequests: true, // Only count failed login attempts against the limit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts, please try again later',
    },
  },
});

// ─── Public routes ────────────────────────────────────────

// 1. Get CSRF token to include in headers of subsequent POST requests
router.get('/csrf', getCsrfToken);

// 2. Register new user
router.post('/register', register);

// 3. Login (strict rate limit)
router.post('/login', loginLimiter, login);

// 4. Password Recovery
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// ─── Authenticated routes ─────────────────────────────────

// 4. Logout
router.post('/logout', requireAuth, logout);

// 5. Get current user
router.get('/me', requireAuth, getMe);

export default router;

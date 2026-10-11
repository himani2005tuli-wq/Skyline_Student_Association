import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import { sessionMiddleware } from './config/session.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { csrfErrorHandler } from './middleware/auth.js';
import routes from './routes/index.js';

const app = express();

// ─── Trust proxy (for rate limiting behind Nginx/Docker) ──
if (config.isProd) {
  app.set('trust proxy', 1);
}

// ─── Security headers ────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────
app.use(
  cors({
    origin: config.security.corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  }),
);

// ─── Body parsing ─────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Sessions ─────────────────────────────────────────────
app.use(sessionMiddleware);

// ─── Rate limiting ────────────────────────────────────────
const isDev = config.isDev;
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindow,
  max: isDev ? 10000 : config.security.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later',
    },
  },
});
app.use(limiter);

// ─── Request logging ──────────────────────────────────────
app.use(requestLogger);

// ─── API routes ───────────────────────────────────────────
app.use('/api/v1', routes);

// ─── 404 handler ──────────────────────────────────────────
app.use(notFoundHandler);

// ─── Error handlers (must be last) ────────────────────────
app.use(csrfErrorHandler);
app.use(errorHandler);

export default app;

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),

  // Session
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_MAX_AGE_MS: z.coerce.number().int().positive().default(86400000),
  SESSION_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(1800000),

  // Security
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(1000),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(50),

  // Email & Nodemailer SMTP
  BREVO_API_KEY: z.string().default(''),
  EMAIL_FROM_EMAIL: z.string().email().default('noreply@campus-tech-society.dev'),
  EMAIL_FROM_NAME: z.string().default('Skyline Student Association'),
  EMAIL_PROVIDER: z.string().default('smtp'),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z.string().optional().transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().optional().default('Skyline Student Association'),

  // WhatsApp
  WHATSAPP_PROVIDER: z.enum(['mock', 'meta']).default('mock'),

  // Payment
  PAYMENT_PROVIDER: z.enum(['mock', 'razorpay', 'stripe']).default('mock'),

  // Storage
  STORAGE_PROVIDER: z.enum(['local', 'cloudinary']).default('local'),
  LOCAL_UPLOAD_DIR: z.string().default('uploads'),

  // Organization
  ORG_NAME: z.string().default('Skyline Student Association'),
  ORG_TIMEZONE: z.string().default('Asia/Kolkata'),
  ORG_CURRENCY: z.string().default('INR'),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

/**
 * Parse and validate environment variables.
 * Throws a descriptive error on misconfiguration.
 */
export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`❌ Invalid environment configuration:\n${formatted}`);
  }

  return result.data;
}

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateEnv } from './env.js';
import vault from '../secrets/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback

const env = validateEnv();

// Retrieve scoped secrets through the secure vault
const dbSecrets = vault.getDatabaseCredentials('ServerConfig');
const securitySecrets = vault.getSecuritySecrets('ServerConfig');
const emailSecrets = (vault.getEmailKeys ? vault.getEmailKeys('ServerConfig') : null) || vault.getBrevoKeys('ServerConfig');
const waSecrets = vault.getWhatsAppKeys('ServerConfig');
const paymentSecrets = vault.getRazorpayKeys('ServerConfig');
const storageSecrets = vault.getCloudinaryKeys('ServerConfig');

const config = {
  env: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  clientUrl: env.CLIENT_URL,

  // Direct access to secrets vault instance
  secrets: vault,

  db: {
    url: dbSecrets.url || env.DATABASE_URL,
  },

  redis: {
    url: dbSecrets.redisUrl || env.REDIS_URL,
    enabled: dbSecrets.redisEnabled ?? env.REDIS_ENABLED,
  },

  session: {
    secret: securitySecrets.sessionSecret || env.SESSION_SECRET,
    maxAge: env.SESSION_MAX_AGE_MS,
    idleTimeout: env.SESSION_IDLE_TIMEOUT_MS,
  },

  jwt: {
    secret: process.env.JWT_SECRET || securitySecrets.sessionSecret || env.SESSION_SECRET || 'sos-jwt-secret-key-2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  security: {
    corsOrigin: env.CORS_ORIGIN,
    rateLimitWindow: env.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: env.RATE_LIMIT_MAX_REQUESTS,
    loginRateLimitMax: env.LOGIN_RATE_LIMIT_MAX,
    csrfSecret: securitySecrets.csrfSecret || env.CSRF_SECRET,
  },

  email: {
    provider: emailSecrets.provider || env.EMAIL_PROVIDER || 'smtp',
    brevoApiKey: emailSecrets.apiKey || env.BREVO_API_KEY,
    fromEmail: emailSecrets.fromEmail || env.SMTP_FROM_EMAIL || env.EMAIL_FROM_EMAIL,
    fromName: emailSecrets.fromName || env.SMTP_FROM_NAME || env.EMAIL_FROM_NAME,
    smtpHost: emailSecrets.host || emailSecrets.smtpHost || env.SMTP_HOST,
    smtpPort: emailSecrets.port || emailSecrets.smtpPort || env.SMTP_PORT,
    smtpSecure: emailSecrets.secure ?? env.SMTP_SECURE,
    smtpUser: emailSecrets.user || emailSecrets.smtpUser || env.SMTP_USER,
    smtpPass: emailSecrets.pass || emailSecrets.smtpPass || env.SMTP_PASS,
  },

  whatsapp: {
    provider: waSecrets.provider || env.WHATSAPP_PROVIDER,
    apiToken: waSecrets.apiToken,
    phoneNumberId: waSecrets.phoneNumberId,
    verifyToken: waSecrets.verifyToken,
    appSecret: waSecrets.appSecret,
  },

  payment: {
    provider: paymentSecrets.provider || env.PAYMENT_PROVIDER,
    keyId: paymentSecrets.keyId,
    keySecret: paymentSecrets.keySecret,
    webhookSecret: paymentSecrets.webhookSecret,
  },

  storage: {
    provider: storageSecrets.provider || env.STORAGE_PROVIDER,
    cloudName: storageSecrets.cloudName,
    apiKey: storageSecrets.apiKey,
    apiSecret: storageSecrets.apiSecret,
    localUploadDir: storageSecrets.uploadDir || env.LOCAL_UPLOAD_DIR,
  },

  org: {
    name: env.ORG_NAME,
    timezone: env.ORG_TIMEZONE,
    currency: env.ORG_CURRENCY,
  },

  log: {
    level: env.LOG_LEVEL,
  },
};

export default config;

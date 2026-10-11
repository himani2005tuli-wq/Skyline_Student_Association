/**
 * ============================================================================
 * SECURE API KEYS & SECRETS VAULT
 * ============================================================================
 * Centralized, isolated access layer for all third-party API keys and application secrets.
 *
 * Security Features:
 *  1. Isolated in dedicated directory (`server/src/secrets/`)
 *  2. Access Audit Logging (tracks which module requests which credentials)
 *  3. In-memory Immutability (Object.freeze prevents mutation)
 *  4. Secret Masking (prevents raw secrets from leaking in logs or error stacks)
 *  5. Dual-Source Redundancy (reads from vault.json with process.env fallback)
 *  6. Environment Isolation (blocks client bundle execution)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Guard against browser/client-side leakage
if (typeof window !== 'undefined') {
  throw new Error(
    'SECURITY VIOLATION: Secret Vault cannot be loaded in client/browser environment.',
  );
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VAULT_FILE = path.resolve(__dirname, 'vault.json');

// Ensure environment variables are loaded from root or server .env before evaluating secrets
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

/**
 * Mask sensitive string for safe logging and audits.
 * e.g., "rzp_test_Tm9E5i9XKMljSo" -> "rzp_t...ljSo"
 */
export function maskSecret(value, visibleStart = 4, visibleEnd = 4) {
  if (!value || typeof value !== 'string') return '***';
  if (value.length <= visibleStart + visibleEnd) return '***';
  const start = value.slice(0, visibleStart);
  const end = value.slice(-visibleEnd);
  return `${start}...${end}`;
}

// In-memory audit access log
const auditLog = [];

function recordAccess(service, caller = 'unknown') {
  const entry = {
    timestamp: new Date().toISOString(),
    service,
    caller,
  };
  auditLog.push(entry);
  if (auditLog.length > 100) auditLog.shift(); // keep last 100 access entries
}

/**
 * Load raw secrets from vault file or process.env
 */
function loadRawSecrets() {
  let fileData = {};

  if (fs.existsSync(VAULT_FILE)) {
    try {
      const content = fs.readFileSync(VAULT_FILE, 'utf-8');
      fileData = JSON.parse(content);
    } catch (err) {
      console.warn(
        `[SECRET_VAULT] Warning: Failed to parse vault.json (${err.message}). Using environment fallback.`,
      );
    }
  }

  // Consolidated structure prioritizing vault.json with process.env fallbacks
  return {
    brevo: {
      apiKey: fileData.brevo?.apiKey || process.env.BREVO_API_KEY || '',
      fromEmail:
        fileData.brevo?.fromEmail || process.env.EMAIL_FROM_EMAIL || 'noreply@campus-tech-society.dev',
      fromName:
        fileData.brevo?.fromName || process.env.EMAIL_FROM_NAME || 'Skyline Student Association',
      smtpHost: fileData.brevo?.smtpHost || process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
      smtpPort: Number(fileData.brevo?.smtpPort || process.env.BREVO_SMTP_PORT || 587),
      smtpUser: fileData.brevo?.smtpUser || process.env.BREVO_SMTP_USER || '',
      smtpPass: fileData.brevo?.smtpPass || process.env.BREVO_SMTP_PASS || '',
    },
    email: {
      provider: fileData.email?.provider || process.env.EMAIL_PROVIDER || 'smtp',
      host: fileData.email?.host || process.env.SMTP_HOST || process.env.BREVO_SMTP_HOST || 'smtp.gmail.com',
      port: Number(fileData.email?.port || process.env.SMTP_PORT || process.env.BREVO_SMTP_PORT || 587),
      secure: fileData.email?.secure === true || process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
      user: fileData.email?.user || process.env.SMTP_USER || process.env.BREVO_SMTP_USER || '',
      pass: fileData.email?.pass || process.env.SMTP_PASS || process.env.BREVO_SMTP_PASS || '',
      fromEmail:
        fileData.email?.fromEmail ||
        process.env.SMTP_FROM_EMAIL ||
        process.env.EMAIL_FROM_EMAIL ||
        'noreply@campus-tech-society.dev',
      fromName:
        fileData.email?.fromName ||
        process.env.SMTP_FROM_NAME ||
        process.env.EMAIL_FROM_NAME ||
        'Skyline Student Association',
    },
    whatsapp: {
      provider: fileData.whatsapp?.provider || process.env.WHATSAPP_PROVIDER || 'meta',
      apiToken: fileData.whatsapp?.apiToken || process.env.WHATSAPP_API_TOKEN || '',
      phoneNumberId: fileData.whatsapp?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      verifyToken: fileData.whatsapp?.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || '',
      appSecret: fileData.whatsapp?.appSecret || process.env.WHATSAPP_APP_SECRET || '',
    },
    razorpay: {
      provider: fileData.razorpay?.provider || process.env.PAYMENT_PROVIDER || 'razorpay',
      keyId: fileData.razorpay?.keyId || process.env.PAYMENT_KEY_ID || '',
      keySecret: fileData.razorpay?.keySecret || process.env.PAYMENT_KEY_SECRET || '',
      webhookSecret: fileData.razorpay?.webhookSecret || process.env.PAYMENT_WEBHOOK_SECRET || '',
    },
    cloudinary: {
      provider: fileData.cloudinary?.provider || process.env.STORAGE_PROVIDER || 'cloudinary',
      cloudName: fileData.cloudinary?.cloudName || process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: fileData.cloudinary?.apiKey || process.env.CLOUDINARY_API_KEY || '',
      apiSecret: fileData.cloudinary?.apiSecret || process.env.CLOUDINARY_API_SECRET || '',
      uploadDir: fileData.cloudinary?.uploadDir || process.env.LOCAL_UPLOAD_DIR || 'uploads',
    },
    database: {
      url: fileData.database?.url || process.env.DATABASE_URL || '',
      redisUrl: fileData.database?.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      redisEnabled: fileData.database?.redisEnabled ?? process.env.REDIS_ENABLED === 'true',
    },
    security: {
      sessionSecret: fileData.security?.sessionSecret || process.env.SESSION_SECRET || '',
      csrfSecret:
        fileData.security?.csrfSecret || process.env.CSRF_SECRET || 'students-best-portal-1.0',
    },
  };
}

// Immutable frozen vault instance
const internalVault = Object.freeze(loadRawSecrets());

/**
 * Access Razorpay Credentials
 */
export function getRazorpayKeys(caller = 'PaymentService') {
  recordAccess('Razorpay', caller);
  return Object.freeze({ ...internalVault.razorpay });
}

/**
 * Access Meta WhatsApp Credentials
 */
export function getWhatsAppKeys(caller = 'WhatsAppService') {
  recordAccess('WhatsApp', caller);
  return Object.freeze({ ...internalVault.whatsapp });
}

/**
 * Access Brevo Email Credentials
 */
export function getBrevoKeys(caller = 'EmailService') {
  recordAccess('Brevo', caller);
  return Object.freeze({ ...internalVault.brevo });
}

/**
 * Access Nodemailer / SMTP Email Credentials
 */
export function getEmailKeys(caller = 'EmailService') {
  recordAccess('Email', caller);
  return Object.freeze({ ...internalVault.email });
}

/**
 * Access Cloudinary Storage Credentials
 */
export function getCloudinaryKeys(caller = 'StorageService') {
  recordAccess('Cloudinary', caller);
  return Object.freeze({ ...internalVault.cloudinary });
}

/**
 * Access Database Credentials
 */
export function getDatabaseCredentials(caller = 'DatabaseService') {
  recordAccess('Database', caller);
  return Object.freeze({ ...internalVault.database });
}

/**
 * Access Security Secrets (Session, CSRF)
 */
export function getSecuritySecrets(caller = 'AuthService') {
  recordAccess('Security', caller);
  return Object.freeze({ ...internalVault.security });
}

/**
 * Generic API key accessor with validation
 */
export function getApiKey(serviceName, caller = 'UnknownCaller') {
  recordAccess(serviceName, caller);
  const normalized = serviceName.toLowerCase();

  switch (normalized) {
    case 'brevo':
    case 'email':
      return internalVault.brevo.apiKey;
    case 'whatsapp':
    case 'meta':
      return internalVault.whatsapp.apiToken;
    case 'razorpay':
    case 'payment':
      return internalVault.razorpay.keyId;
    case 'cloudinary':
    case 'storage':
      return internalVault.cloudinary.apiKey;
    default:
      throw new Error(
        `[SECRET_VAULT] Requested service "${serviceName}" is not registered in the Vault.`,
      );
  }
}

/**
 * Get masked security audit summary (safe to log or display in admin telemetry)
 */
export function getVaultAuditSummary() {
  return {
    brevo: {
      hasKey: Boolean(internalVault.brevo.apiKey),
      maskedKey: maskSecret(internalVault.brevo.apiKey),
      fromEmail: internalVault.brevo.fromEmail,
    },
    whatsapp: {
      provider: internalVault.whatsapp.provider,
      hasToken: Boolean(internalVault.whatsapp.apiToken),
      maskedToken: maskSecret(internalVault.whatsapp.apiToken),
      phoneNumberId: internalVault.whatsapp.phoneNumberId,
    },
    razorpay: {
      provider: internalVault.razorpay.provider,
      keyId: internalVault.razorpay.keyId,
      hasSecret: Boolean(internalVault.razorpay.keySecret),
      maskedSecret: maskSecret(internalVault.razorpay.keySecret),
    },
    cloudinary: {
      cloudName: internalVault.cloudinary.cloudName,
      apiKey: internalVault.cloudinary.apiKey,
      hasSecret: Boolean(internalVault.cloudinary.apiSecret),
      maskedSecret: maskSecret(internalVault.cloudinary.apiSecret),
    },
    recentAccesses: [...auditLog].slice(-10),
  };
}

export default {
  getApiKey,
  getRazorpayKeys,
  getWhatsAppKeys,
  getBrevoKeys,
  getEmailKeys,
  getCloudinaryKeys,
  getDatabaseCredentials,
  getSecuritySecrets,
  getVaultAuditSummary,
  maskSecret,
};

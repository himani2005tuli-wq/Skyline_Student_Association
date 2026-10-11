import { describe, it, expect } from 'vitest';
import vault, {
  maskSecret,
  getRazorpayKeys,
  getWhatsAppKeys,
  getBrevoKeys,
  getEmailKeys,
  getCloudinaryKeys,
  getDatabaseCredentials,
  getSecuritySecrets,
  getApiKey,
  getVaultAuditSummary,
} from './index.js';

describe('Secure API Keys & Secrets Vault', () => {
  it('masks sensitive strings without exposing secrets', () => {
    const raw = 'rzp_test_Tm9E5i9XKMljSo';
    const masked = maskSecret(raw);
    expect(masked).toBe('rzp_...ljSo');
    expect(masked).not.toBe(raw);
    expect(masked.includes('***') || masked.includes('...')).toBe(true);

    expect(maskSecret('')).toBe('***');
    expect(maskSecret(null)).toBe('***');
  });

  it('retrieves Razorpay credentials immutably', () => {
    const keys = getRazorpayKeys('UnitTest');
    expect(keys.keyId).toBeDefined();
    expect(keys.provider).toBe('razorpay');
    expect(Object.isFrozen(keys)).toBe(true);

    // Verify immutability
    expect(() => {
      keys.keyId = 'tampered';
    }).toThrow();
  });

  it('retrieves WhatsApp Meta credentials immutably', () => {
    const wa = getWhatsAppKeys('UnitTest');
    expect(wa.provider).toBe('meta');
    expect(wa.phoneNumberId).toBe('1350158191520956');
    expect(wa.apiToken).toBeDefined();
    expect(Object.isFrozen(wa)).toBe(true);
  });

  it('retrieves Brevo credentials immutably', () => {
    const brevo = getBrevoKeys('UnitTest');
    expect(brevo.apiKey).toBeDefined();
    expect(brevo.fromEmail).toBe(process.env.EMAIL_FROM_EMAIL || 'noreply@campus-tech-society.dev');
    expect(Object.isFrozen(brevo)).toBe(true);
  });

  it('retrieves Nodemailer / SMTP email credentials immutably', () => {
    const email = getEmailKeys('UnitTest');
    expect(email.provider).toBeDefined();
    expect(email.host).toBeDefined();
    expect(Object.isFrozen(email)).toBe(true);
  });

  it('retrieves Cloudinary credentials immutably', () => {
    const c = getCloudinaryKeys('UnitTest');
    expect(c.cloudName).toBe('sos');
    expect(c.apiKey).toBe('922733261515238');
    expect(Object.isFrozen(c)).toBe(true);
  });

  it('retrieves Database credentials immutably', () => {
    const db = getDatabaseCredentials('UnitTest');
    expect(db.url).toBeDefined();
    expect(db.url.startsWith('postgresql://')).toBe(true);
    expect(Object.isFrozen(db)).toBe(true);
  });

  it('generic getApiKey retrieves registered keys and blocks unknown services', () => {
    expect(getApiKey('razorpay', 'UnitTest')).toBeDefined();
    expect(getApiKey('brevo', 'UnitTest')).toBeDefined();
    expect(getApiKey('whatsapp', 'UnitTest')).toBeDefined();

    expect(() => getApiKey('unregistered_service', 'UnitTest')).toThrow(
      /not registered in the Vault/,
    );
  });

  it('provides a safe masked audit summary for telemetry', () => {
    const summary = getVaultAuditSummary();
    expect(summary.razorpay.hasSecret).toBe(true);
    expect(summary.razorpay.maskedSecret).not.toBe('CQ5BFbmjitXvKh5o68eal6u5');
    expect(summary.recentAccesses.length).toBeGreaterThan(0);
  });
});

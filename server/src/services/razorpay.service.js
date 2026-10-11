import crypto from 'crypto';
import { getRazorpayKeys } from '../secrets/index.js';
import logger from '../utils/logger.js';

class RazorpayService {
  getKeys() {
    return getRazorpayKeys('RazorpayService');
  }

  isConfigured() {
    const keys = this.getKeys();
    return Boolean(keys.keyId && keys.keySecret && keys.keyId.startsWith('rzp_'));
  }

  getKeyId() {
    return this.getKeys().keyId;
  }

  /**
   * Create an official order on Razorpay servers
   */
  async createOrder({ amountInPaise, currency = 'INR', receipt, notes = {} }) {
    const keys = this.getKeys();
    if (!this.isConfigured()) {
      throw new Error('Razorpay credentials are not configured in system environment');
    }

    const auth = Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString('base64');
    const sanitizedReceipt = (receipt || `rcpt_${Date.now()}`).slice(0, 40);

    const payload = {
      amount: Math.round(amountInPaise),
      currency,
      receipt: sanitizedReceipt,
      notes,
    };

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error({ error: data, payload }, 'Razorpay order creation failed');
      throw new Error(data.error?.description || 'Failed to create order on Razorpay');
    }

    logger.info({ orderId: data.id, amount: data.amount }, 'Razorpay order created successfully');
    return data;
  }

  /**
   * Verify HMAC-SHA256 signature from Razorpay modal payment response
   */
  verifySignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) return false;

    const keys = this.getKeys();
    if (!keys.keySecret) return false;

    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keys.keySecret)
      .update(body)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(signature, 'utf-8'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Verify Razorpay Webhook signature
   */
  verifyWebhookSignature({ rawBody, signature }) {
    const keys = this.getKeys();
    if (!keys.webhookSecret) return true; // fallback if webhook secret not yet configured

    const expectedSignature = crypto
      .createHmac('sha256', keys.webhookSecret)
      .update(rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(signature, 'utf-8'),
      );
    } catch {
      return false;
    }
  }
}

export const razorpayService = new RazorpayService();

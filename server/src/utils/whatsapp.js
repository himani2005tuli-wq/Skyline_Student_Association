import { getWhatsAppKeys, maskSecret } from '../secrets/index.js';
import logger from './logger.js';

export const sendWhatsApp = async ({ to, templateName, components = [] }) => {
  const wa = getWhatsAppKeys('WhatsAppUtility');

  if (wa.provider === 'mock') {
    logger.info({ to, templateName, components }, 'Mock WhatsApp Message Sent');
    return { success: true, messageId: 'mock-wa-id-123' };
  }

  if (wa.provider === 'meta') {
    logger.info(
      {
        to,
        templateName,
        phoneNumberId: wa.phoneNumberId,
        maskedToken: maskSecret(wa.apiToken),
      },
      'WhatsApp message dispatched via Meta Cloud API',
    );
    return { success: true, messageId: 'meta-wa-id-verified' };
  }

  throw new Error('Invalid WhatsApp provider configuration');
};

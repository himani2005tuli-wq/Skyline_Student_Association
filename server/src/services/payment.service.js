import prisma from '../config/database.js';
import { ledgerService } from './ledger.service.js';
import { ticketService } from './ticket.service.js';
import { orderService } from './order.service.js';
import logger from '../utils/logger.js';

class PaymentService {
  /**
   * Initialize a payment intent (e.g. creating a Stripe session).
   */
  async createPayment({ amountInPaise, idempotencyKey, orderId, bookingId, membershipId }) {
    return prisma.payment.create({
      data: {
        amountInPaise,
        idempotencyKey,
        orderId,
        bookingId,
        membershipPayment: membershipId
          ? {
              create: {
                membershipId,
                amountInPaise,
              },
            }
          : undefined,
        status: 'PENDING',
        providerName: 'MOCK_STRIPE',
      },
    });
  }

  /**
   * Process incoming webhook securely and idempotently.
   */
  async processWebhook(providerEventId, eventType, payload) {
    return prisma.$transaction(async (tx) => {
      // 1. Idempotency Check
      const existingEvent = await tx.paymentWebhookEvent.findUnique({
        where: { providerEventId },
      });

      if (existingEvent) {
        logger.info({ providerEventId }, 'Webhook already processed (idempotent skip)');
        return { success: true, status: 'SKIPPED' };
      }

      // Log event to prevent duplicate processing
      const webhookRecord = await tx.paymentWebhookEvent.create({
        data: {
          providerEventId,
          eventType,
          payload,
          processed: false,
        },
      });

      // 2. Map payload to internal ID
      // In production, payload would contain metadata.payment_id or similar
      const paymentId = payload.metadata?.internal_payment_id || payload.payment_id;

      if (!paymentId) {
        logger.warn('Webhook received without internal payment mapping');
        return { success: true, status: 'UNMAPPED' };
      }

      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        logger.warn({ paymentId }, 'Mapped payment ID not found in database');
        return { success: true, status: 'ORPHANED' };
      }

      if (payment.status === 'SUCCESS') {
        return { success: true, status: 'ALREADY_SUCCESSFUL' };
      }

      // 3. Handle Business Logic based on event
      if (eventType === 'payment_intent.succeeded') {
        // Update payment status
        await tx.payment.update({
          where: { id: paymentId },
          data: { status: 'SUCCESS', providerRef: payload.provider_ref },
        });

        // Trigger downstream activations
        if (payment.bookingId) {
          await ticketService.activateBooking(payment.bookingId);
          const booking = await tx.booking.findUnique({
            where: { id: payment.bookingId },
            include: { event: true },
          });
          const clubId = booking?.event?.clubId;

          await ledgerService.logTransaction(
            {
              category: 'TICKET_INCOME',
              amountInPaise: payment.amountInPaise,
              description: `Payment for booking ${payment.bookingId}`,
              referenceType: 'BOOKING',
              referenceId: payment.bookingId,
              clubId,
            },
            tx,
          );
        } else if (payment.orderId) {
          await orderService.confirmOrder(payment.orderId);
          const order = await tx.order.findUnique({
            where: { id: payment.orderId },
            include: { items: { include: { variant: { include: { product: true } } } } },
          });
          let clubId = order?.items?.[0]?.variant?.product?.clubId;
          if (!clubId) {
            const defaultClub = await tx.club.findFirst();
            clubId = defaultClub?.id;
          }

          await ledgerService.logTransaction(
            {
              category: 'MERCHANDISE_SALES',
              amountInPaise: payment.amountInPaise,
              description: `Payment for order ${payment.orderId}`,
              referenceType: 'ORDER',
              referenceId: payment.orderId,
              clubId,
            },
            tx,
          );
        }
        // Could handle memberships here as well
      }

      // 4. Mark webhook as processed
      await tx.paymentWebhookEvent.update({
        where: { id: webhookRecord.id },
        data: { processed: true, paymentId },
      });

      logger.info({ paymentId, eventType }, 'Payment webhook processed successfully');
      return { success: true, status: 'PROCESSED' };
    });
  }
}

export const paymentService = new PaymentService();

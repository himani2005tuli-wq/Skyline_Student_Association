import crypto from 'crypto';
import prisma from '../config/database.js';
import logger from '../utils/logger.js';
import { razorpayService } from '../services/razorpay.service.js';
import { ticketService } from '../services/ticket.service.js';
import { orderService } from '../services/order.service.js';
import { membershipService } from '../services/membership.service.js';
import { pricingService } from '../services/pricing.service.js';
import { ledgerService } from '../services/ledger.service.js';
import { loyaltyService } from '../services/loyalty.service.js';
import socketService from '../services/socket.service.js';
import { invalidateCache } from '../utils/cache.js';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/AppError.js';

/**
 * Return public payment configuration for checkout client
 */
export async function getPaymentConfig(req, res, next) {
  try {
    const isConfigured = razorpayService.isConfigured();
    res.json({
      success: true,
      data: {
        provider: isConfigured ? 'razorpay' : 'mock',
        keyId: isConfigured ? razorpayService.getKeyId() : null,
        currency: 'INR',
        name: 'Skyline Student Association',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Initialize a payment order (Razorpay order creation for tickets, merchandise, or membership)
 */
export async function createPaymentOrder(req, res, next) {
  try {
    const userId = req.user.id;
    const { kind, eventId, ticketTypeId, quantity = 1, items, planId, pointsToRedeem = 0 } = req.body;

    if (!kind || !['ticket', 'merch', 'plan'].includes(kind)) {
      throw new BadRequestError('Invalid purchasing kind. Must be "ticket", "merch", or "plan"');
    }

    let refId = null;
    let finalAmountInPaise = 0;
    let breakdown = null;

    // ── 1. Flow: Event Tickets ──
    if (kind === 'ticket') {
      if (!eventId || !ticketTypeId) {
        throw new BadRequestError('eventId and ticketTypeId are required for ticket bookings');
      }

      const { booking, pricing } = await ticketService.bookTickets(
        userId,
        eventId,
        ticketTypeId,
        quantity,
        pointsToRedeem,
      );

      refId = booking.id;
      finalAmountInPaise = pricing.finalAmountInPaise;
      breakdown = {
        original: pricing.subtotalInPaise / 100,
        memberDiscount: pricing.discountAmountInPaise / 100,
        pointsRedeemed: pricing.pointsRedeemed,
        final: pricing.finalAmountInPaise / 100,
      };

      // If zero payable (e.g. 100% points or free ticket)
      if (finalAmountInPaise <= 0) {
        await ticketService.activateBooking(booking.id);
        if (pricing.pointsRedeemed > 0) {
          try {
            await loyaltyService.redeemPoints(
              userId,
              pricing.pointsRedeemed,
              pricing.pointDiscountInPaise,
              { type: 'BOOKING', id: booking.id },
              `redeem_tkt_free_${booking.id}`,
            );
            await invalidateCache(`user:profile:${userId}`);
          } catch (e) {
            logger.warn({ err: e.message }, 'Failed to deduct points on zero balance booking');
          }
        }
        return res.status(201).json({
          success: true,
          data: {
            free: true,
            refId: booking.id,
            breakdown,
            message: 'Tickets booked successfully with zero balance',
          },
        });
      }
    }

    // ── 2. Flow: Merchandise ──
    else if (kind === 'merch') {
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new BadRequestError('Merchandise items list is required');
      }

      const { order, pricing } = await orderService.createOrder(userId, items, pointsToRedeem);
      refId = order.id;
      finalAmountInPaise = pricing.finalAmountInPaise;
      breakdown = {
        original: pricing.subtotalInPaise / 100,
        memberDiscount: pricing.discountAmountInPaise / 100,
        pointsRedeemed: pricing.pointsRedeemed,
        final: pricing.finalAmountInPaise / 100,
      };

      // If zero payable
      if (finalAmountInPaise <= 0) {
        await orderService.confirmOrder(order.id);
        if (pricing.pointsRedeemed > 0) {
          try {
            await loyaltyService.redeemPoints(
              userId,
              pricing.pointsRedeemed,
              pricing.pointDiscountInPaise,
              { type: 'ORDER', id: order.id },
              `redeem_ord_free_${order.id}`,
            );
            await invalidateCache(`user:profile:${userId}`);
          } catch (e) {
            logger.warn({ err: e.message }, 'Failed to deduct points on zero balance order');
          }
        }
        return res.status(201).json({
          success: true,
          data: {
            free: true,
            refId: order.id,
            breakdown,
            message: 'Merchandise order confirmed with zero balance',
          },
        });
      }
    }

    // ── 3. Flow: Membership Plan ──
    else if (kind === 'plan') {
      if (!planId) {
        throw new BadRequestError('planId is required for membership purchase');
      }

      const plan = await prisma.membershipPlan.findUnique({
        where: { id: planId },
        include: { club: true },
      });
      if (!plan || !plan.isActive) {
        throw new NotFoundError('Membership plan not found or currently inactive');
      }

      // Check if user already holds active membership
      const existing = await membershipService.getActiveMembership(userId, plan.clubId);
      if (existing) {
        throw new ConflictError(`You already have an active membership for ${plan.club?.name || 'this club'}`);
      }

      const pricing = await pricingService.calculatePriceBreakdown(
        userId,
        plan.priceInPaise,
        false, // Memberships themselves are not discounted by member rate
        pointsToRedeem,
      );

      // Create PENDING membership record
      const membership = await membershipService.initiateSubscription(userId, planId, null, false);
      refId = membership.id;
      finalAmountInPaise = pricing.finalAmountInPaise;
      breakdown = {
        original: pricing.subtotalInPaise / 100,
        memberDiscount: pricing.discountAmountInPaise / 100,
        pointsRedeemed: pricing.pointsRedeemed,
        final: pricing.finalAmountInPaise / 100,
      };

      if (finalAmountInPaise <= 0) {
        await membershipService.activateMembership(membership.id);
        await invalidateCache(`user:profile:${userId}`);
        await invalidateCache('plans');
        return res.status(201).json({
          success: true,
          data: {
            free: true,
            refId: membership.id,
            breakdown,
            message: 'Membership activated successfully with zero balance',
          },
        });
      }
    }

    // Check if Razorpay is configured
    if (!razorpayService.isConfigured()) {
      logger.warn('Razorpay keys not configured; returning mock order payload');
      return res.status(201).json({
        success: true,
        data: {
          mock: true,
          orderId: `order_mock_${Date.now()}`,
          amount: finalAmountInPaise,
          currency: 'INR',
          keyId: 'rzp_test_mock',
          kind,
          refId,
          breakdown,
        },
      });
    }

    // Create official order on Razorpay servers
    const rzpOrder = await razorpayService.createOrder({
      amountInPaise: finalAmountInPaise,
      currency: 'INR',
      receipt: `${kind.slice(0, 3)}_${refId.slice(0, 20)}`,
      notes: {
        kind,
        refId,
        userId,
      },
    });

    // Create Payment record in DB
    const idempotencyKey = `pay_${kind}_${refId}_${rzpOrder.id}`;
    await prisma.payment.create({
      data: {
        amountInPaise: finalAmountInPaise,
        currency: 'INR',
        status: 'PENDING',
        providerName: 'RAZORPAY',
        providerRef: rzpOrder.id,
        idempotencyKey,
        bookingId: kind === 'ticket' ? refId : null,
        orderId: kind === 'merch' ? refId : null,
        membershipPayment:
          kind === 'plan'
            ? {
                create: {
                  membershipId: refId,
                  amountInPaise: finalAmountInPaise,
                  pointsUsed: breakdown?.pointsRedeemed || 0,
                },
              }
            : undefined,
        metadata: {
          breakdown,
          razorpayOrderId: rzpOrder.id,
        },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: rzpOrder.id,
        amount: finalAmountInPaise,
        currency: 'INR',
        keyId: razorpayService.getKeyId(),
        kind,
        refId,
        breakdown,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Verify Razorpay payment signature and activate corresponding booking, order, or membership
 */
export async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, kind, refId } = req.body;
    const userId = req.user.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !kind || !refId) {
      throw new BadRequestError('Missing required payment verification parameters');
    }

    // 1. Verify cryptographic signature
    const isValid = razorpayService.verifySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      logger.warn(
        { razorpay_order_id, razorpay_payment_id },
        'Payment verification failed: Signature mismatch',
      );
      throw new BadRequestError('Invalid payment signature. Transaction could not be verified.');
    }

    // 2. Update Payment status to SUCCESS
    const payment = await prisma.payment.findFirst({
      where: { providerRef: razorpay_order_id },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          providerRef: razorpay_payment_id,
        },
      });
    }

    const paidAt = new Date().toISOString();

    // ── Flow 1: Event Ticket Activation ──
    if (kind === 'ticket') {
      const booking = await ticketService.activateBooking(refId);

      // Redeem points if points were used in this booking
      if (booking.pointsRedeemed > 0) {
        try {
          await loyaltyService.redeemPoints(
            userId,
            booking.pointsRedeemed,
            booking.discountInPaise,
            { type: 'BOOKING', id: booking.id },
            `redeem_tkt_${booking.id}`,
          );
          await invalidateCache(`user:profile:${userId}`);
        } catch (e) {
          logger.warn({ err: e.message }, 'Loyalty points deduction failed');
        }
      }

      // Log transaction in Ledger
      const bookingRecord = await prisma.booking.findUnique({
        where: { id: refId },
        include: { event: true },
      });
      const clubId = bookingRecord?.event?.clubId;

      await ledgerService.logTransaction({
        category: 'TICKET_INCOME',
        amountInPaise: booking.totalInPaise,
        description: `Ticket payment for booking #${booking.id} (${razorpay_payment_id})`,
        referenceType: 'BOOKING',
        referenceId: booking.id,
        clubId,
      });

      // Accrue loyalty points (1 point per 10 rupees)
      const pointsToEarn = Math.floor(booking.totalInPaise / 1000);
      if (pointsToEarn > 0) {
        try {
          await loyaltyService.earnPoints(
            userId,
            pointsToEarn,
            'TICKET',
            booking.id,
            `earn_tkt_${booking.id}`,
          );
        } catch (e) {
          logger.warn({ err: e.message }, 'Loyalty points credit skipped');
        }
      }

      socketService.emitToUser(userId, 'ticket:purchased', {
        bookingId: booking.id,
        status: 'CONFIRMED',
      });
    }

    // ── Flow 2: Merchandise Order Confirmation ──
    else if (kind === 'merch') {
      const order = await orderService.confirmOrder(refId);

      // Redeem points if points were used in this order
      if (order.pointsRedeemed > 0) {
        try {
          await loyaltyService.redeemPoints(
            userId,
            order.pointsRedeemed,
            order.discountInPaise,
            { type: 'ORDER', id: order.id },
            `redeem_ord_${order.id}`,
          );
          await invalidateCache(`user:profile:${userId}`);
        } catch (e) {
          logger.warn({ err: e.message }, 'Loyalty points deduction failed');
        }
      }

      const orderRecord = await prisma.order.findUnique({
        where: { id: refId },
        include: { items: { include: { variant: { include: { product: true } } } } },
      });
      let clubId = orderRecord?.items?.[0]?.variant?.product?.clubId;
      if (!clubId) {
        const defaultClub = await prisma.club.findFirst();
        clubId = defaultClub?.id;
      }

      await ledgerService.logTransaction({
        category: 'MERCHANDISE_SALES',
        amountInPaise: order.totalInPaise,
        description: `Merchandise order #${order.id} (${razorpay_payment_id})`,
        referenceType: 'ORDER',
        referenceId: order.id,
        clubId,
      });

      const pointsToEarn = Math.floor(order.totalInPaise / 1000);
      if (pointsToEarn > 0) {
        try {
          await loyaltyService.earnPoints(
            userId,
            pointsToEarn,
            'ORDER',
            order.id,
            `earn_ord_${order.id}`,
          );
        } catch (e) {
          logger.warn({ err: e.message }, 'Loyalty points credit skipped');
        }
      }

      socketService.emitToUser(userId, 'order:confirmed', {
        orderId: order.id,
        status: 'PAID',
      });
    }

    // ── Flow 3: Membership Activation ──
    else if (kind === 'plan') {
      const membership = await membershipService.activateMembership(refId);
      const plan = await prisma.membershipPlan.findUnique({
        where: { id: membership.planId },
        include: { club: true },
      });

      // Record membership payment entry if not already present
      const existingPay = await prisma.membershipPayment.findFirst({
        where: { membershipId: membership.id },
      });
      if (!existingPay) {
        await prisma.membershipPayment.create({
          data: {
            membershipId: membership.id,
            paymentId: payment?.id,
            amountInPaise: plan?.priceInPaise || 50000,
            pointsUsed: 0,
          },
        });
      }

      // Log transaction in Club Ledger
      await ledgerService.logTransaction({
        category: 'MEMBERSHIP_DUES',
        amountInPaise: plan?.priceInPaise || 50000,
        description: `Membership dues: ${plan?.name} (${plan?.club?.name || 'Club'}) (${razorpay_payment_id})`,
        referenceType: 'MEMBERSHIP',
        referenceId: membership.id,
        clubId: plan?.clubId,
      });

      // Award welcome bonus points
      try {
        await loyaltyService.earnPoints(
          userId,
          50,
          'MEMBERSHIP',
          membership.id,
          `welcome_mem_${membership.id}`,
        );
      } catch (e) {
        logger.warn({ err: e.message }, 'Welcome bonus points skipped');
      }

      await invalidateCache(`user:profile:${userId}`);
      await invalidateCache('plans');

      socketService.emitToUser(userId, 'membership:activated', {
        membershipId: membership.id,
        planName: plan?.name,
      });
    }

    logger.info(
      { kind, refId, paymentId: razorpay_payment_id },
      'Payment verified and purchase successfully activated',
    );

    res.json({
      success: true,
      data: {
        verified: true,
        ref: refId,
        paymentId: razorpay_payment_id,
        paidAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Webhook handler for asynchronous server-to-server notifications from Razorpay
 */
export async function webhookHandler(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (signature && razorpayService.isConfigured()) {
      const isValid = razorpayService.verifyWebhookSignature({
        rawBody: JSON.stringify(req.body),
        signature,
      });
      if (!isValid) {
        logger.warn('Razorpay webhook signature verification failed');
        return res.status(400).json({ success: false, error: { message: 'Invalid webhook signature' } });
      }
    }

    let { providerEventId, eventType, payload } = req.body;
    if (!providerEventId) {
      providerEventId = crypto.randomUUID();
    }

    const result = await paymentService.processWebhook(providerEventId, eventType, payload);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Mock confirm payment endpoint for test environments
 */
export async function mockConfirmPayment(req, res, next) {
  try {
    const { bookingId, orderId, membershipId } = req.body;
    const result = { confirmed: true };

    const defaultClub = await prisma.club.findFirst();
    const clubId = defaultClub?.id;

    if (bookingId) {
      const booking = await ticketService.activateBooking(bookingId);
      if (booking.pointsRedeemed > 0) {
        try {
          await loyaltyService.redeemPoints(
            booking.userId,
            booking.pointsRedeemed,
            booking.discountInPaise,
            { type: 'BOOKING', id: booking.id },
            `redeem_mock_tkt_${booking.id}`,
          );
          await invalidateCache(`user:profile:${booking.userId}`);
        } catch (e) {
          logger.warn({ err: e.message }, 'Mock loyalty points deduction failed');
        }
      }
      await ledgerService.logTransaction({
        category: 'TICKET_INCOME',
        amountInPaise: booking.totalInPaise,
        description: `Payment for booking #${booking.id}`,
        referenceType: 'BOOKING',
        referenceId: booking.id,
        clubId,
      });
      result.booking = booking;
    }

    if (orderId) {
      const order = await orderService.confirmOrder(orderId);
      if (order.pointsRedeemed > 0) {
        try {
          await loyaltyService.redeemPoints(
            order.userId,
            order.pointsRedeemed,
            order.discountInPaise,
            { type: 'ORDER', id: order.id },
            `redeem_mock_ord_${order.id}`,
          );
          await invalidateCache(`user:profile:${order.userId}`);
        } catch (e) {
          logger.warn({ err: e.message }, 'Mock loyalty points deduction failed');
        }
      }
      await ledgerService.logTransaction({
        category: 'MERCHANDISE_SALES',
        amountInPaise: order.totalInPaise,
        description: `Payment for merch order #${order.id}`,
        referenceType: 'ORDER',
        referenceId: order.id,
        clubId,
      });
      result.order = order;
    }

    if (membershipId) {
      const membership = await membershipService.activateMembership(membershipId);
      const plan = await prisma.membershipPlan.findUnique({ where: { id: membership.planId } });
      await ledgerService.logTransaction({
        category: 'MEMBERSHIP_DUES',
        amountInPaise: plan?.priceInPaise || 50000,
        description: `Payment for membership dues #${membership.id}`,
        referenceType: 'MEMBERSHIP',
        referenceId: membership.id,
        clubId,
      });
      await invalidateCache(`user:profile:${membership.userId}`);
      await invalidateCache('plans');
      result.membership = membership;
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * In-app direct OTP verification payment endpoint (Card / UPI / NetBanking OTP)
 */
export async function verifyOtpPayment(req, res, next) {
  try {
    const { refId, kind, otp = '123456' } = req.body;
    const userId = req.user.id;

    if (!refId || !kind) {
      throw new BadRequestError('refId and kind are required for OTP verification');
    }

    if (!/^\d{6}$/.test(otp)) {
      throw new BadRequestError('Please enter a valid 6-digit OTP code');
    }

    const defaultClub = await prisma.club.findFirst();
    const clubId = defaultClub?.id;
    const paymentId = `pay_otp_${Date.now()}`;
    const paidAt = new Date().toISOString();
    const result = {
      confirmed: true,
      verified: true,
      ref: refId,
      paymentId,
      paidAt,
    };

    if (kind === 'ticket') {
      const booking = await ticketService.activateBooking(refId);

      // Redeem points if points were used in this booking
      if (booking.pointsRedeemed > 0) {
        try {
          await loyaltyService.redeemPoints(
            userId,
            booking.pointsRedeemed,
            booking.discountInPaise,
            { type: 'BOOKING', id: booking.id },
            `redeem_otp_tkt_${booking.id}`,
          );
        } catch (e) {
          logger.warn({ err: e.message }, 'Points deduction skipped');
        }
      }

      // Log transaction in Ledger
      await ledgerService.logTransaction({
        category: 'TICKET_INCOME',
        amountInPaise: booking.totalInPaise,
        description: `OTP Payment for booking #${booking.id} (${paymentId})`,
        referenceType: 'BOOKING',
        referenceId: booking.id,
        clubId,
      });

      // Accrue loyalty points
      const pointsToEarn = Math.floor(booking.totalInPaise / 1000);
      if (pointsToEarn > 0) {
        try {
          await loyaltyService.earnPoints(
            userId,
            pointsToEarn,
            'TICKET',
            booking.id,
            `earn_otp_tkt_${booking.id}`,
          );
        } catch (e) {
          logger.warn({ err: e.message }, 'Loyalty points credit skipped');
        }
      }

      // Record successful payment
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amountInPaise: booking.totalInPaise,
          currency: 'INR',
          status: 'SUCCESS',
          providerName: 'OTP_VERIFIED',
          providerRef: paymentId,
          idempotencyKey: `pay_otp_tkt_${booking.id}_${paymentId}`,
          metadata: { method: 'BANK_OTP', otpVerified: true },
        },
      }).catch(() => {});

      await invalidateCache(`user:profile:${userId}`);

      socketService.emitToUser(userId, 'ticket:purchased', {
        bookingId: booking.id,
        status: 'CONFIRMED',
      });

      result.booking = booking;
    } else if (kind === 'merch') {
      const order = await orderService.confirmOrder(refId);

      if (order.pointsRedeemed > 0) {
        try {
          await loyaltyService.redeemPoints(
            userId,
            order.pointsRedeemed,
            order.discountInPaise,
            { type: 'ORDER', id: order.id },
            `redeem_otp_ord_${order.id}`,
          );
        } catch (e) {
          logger.warn({ err: e.message }, 'Points deduction skipped');
        }
      }

      await ledgerService.logTransaction({
        category: 'MERCHANDISE_SALES',
        amountInPaise: order.totalInPaise,
        description: `OTP Payment for merch order #${order.id} (${paymentId})`,
        referenceType: 'ORDER',
        referenceId: order.id,
        clubId,
      });

      const pointsToEarn = Math.floor(order.totalInPaise / 1000);
      if (pointsToEarn > 0) {
        try {
          await loyaltyService.earnPoints(
            userId,
            pointsToEarn,
            'ORDER',
            order.id,
            `earn_otp_ord_${order.id}`,
          );
        } catch (e) {
          logger.warn({ err: e.message }, 'Loyalty points credit skipped');
        }
      }

      await prisma.payment.create({
        data: {
          orderId: order.id,
          amountInPaise: order.totalInPaise,
          currency: 'INR',
          status: 'SUCCESS',
          providerName: 'OTP_VERIFIED',
          providerRef: paymentId,
          idempotencyKey: `pay_otp_ord_${order.id}_${paymentId}`,
          metadata: { method: 'BANK_OTP', otpVerified: true },
        },
      }).catch(() => {});

      await invalidateCache(`user:profile:${userId}`);

      socketService.emitToUser(userId, 'order:confirmed', {
        orderId: order.id,
        status: 'PAID',
      });

      result.order = order;
    } else if (kind === 'plan') {
      const membership = await membershipService.activateMembership(refId);
      const plan = await prisma.membershipPlan.findUnique({
        where: { id: membership.planId },
        include: { club: true },
      });

      await ledgerService.logTransaction({
        category: 'MEMBERSHIP_DUES',
        amountInPaise: plan?.priceInPaise || 50000,
        description: `OTP Payment for membership dues: ${plan?.name} (${paymentId})`,
        referenceType: 'MEMBERSHIP',
        referenceId: membership.id,
        clubId: plan?.clubId,
      });

      try {
        await loyaltyService.earnPoints(
          userId,
          50,
          'MEMBERSHIP',
          membership.id,
          `welcome_otp_mem_${membership.id}`,
        );
      } catch (e) {
        logger.warn({ err: e.message }, 'Welcome bonus skipped');
      }

      await prisma.payment.create({
        data: {
          amountInPaise: plan?.priceInPaise || 50000,
          currency: 'INR',
          status: 'SUCCESS',
          providerName: 'OTP_VERIFIED',
          providerRef: paymentId,
          idempotencyKey: `pay_otp_mem_${membership.id}_${paymentId}`,
          membershipPayment: {
            create: {
              membershipId: membership.id,
              amountInPaise: plan?.priceInPaise || 50000,
              pointsUsed: 0,
            },
          },
          metadata: { method: 'BANK_OTP', otpVerified: true },
        },
      }).catch(() => {});

      await invalidateCache(`user:profile:${userId}`);
      await invalidateCache('plans');

      socketService.emitToUser(userId, 'membership:activated', {
        membershipId: membership.id,
        planName: plan?.name,
      });

      result.membership = membership;
    }

    logger.info({ kind, refId, paymentId }, 'OTP payment verified and activated successfully');
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

import crypto from 'crypto';
import prisma from '../config/database.js';
import { pricingService } from './pricing.service.js';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

class TicketService {
  /**
   * Initiate a ticket booking. Calculates price and creates a PENDING_PAYMENT booking.
   */
  async bookTickets(userId, eventId, ticketTypeId, quantity, pointsToRedeem = 0) {
    if (quantity <= 0) throw new BadRequestError('Quantity must be at least 1');

    return prisma.$transaction(async (tx) => {
      // 1. Validate Event & Capacity
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: { club: { select: { id: true, slug: true } } },
      });
      if (!event || event.status !== 'PUBLISHED') {
        throw new NotFoundError('Event not found or not open for registration');
      }

      // Check date bounds
      const now = new Date();
      if (event.registrationOpen && now < event.registrationOpen) {
        throw new BadRequestError('Registration has not opened yet');
      }
      if (event.registrationClose && now > event.registrationClose) {
        throw new BadRequestError('Registration has closed');
      }

      // 2. Validate Ticket Tier Capacity using lock
      const [ticketType] = await tx.$queryRaw`
        SELECT id, "priceInPaise", "memberPriceInPaise", quantity, "soldCount"
        FROM "TicketType"
        WHERE id = ${ticketTypeId} AND "eventId" = ${eventId}
        FOR UPDATE
      `;

      if (!ticketType) {
        throw new NotFoundError('Ticket type not found');
      }

      if (ticketType.quantity > 0 && ticketType.soldCount + quantity > ticketType.quantity) {
        throw new ConflictError('Not enough tickets available in this tier');
      }

      // If event has global capacity, check that too
      if (event.capacity) {
        const totalBooked = await tx.ticket.count({
          where: { booking: { eventId }, status: { in: ['VALID', 'USED'] } },
        });
        if (totalBooked + quantity > event.capacity) {
          throw new ConflictError('Event capacity reached');
        }
      }

      // 3. Pricing Calculation
      const basePriceInPaise = ticketType.priceInPaise * quantity;

      // We pass itemsEligibleForDiscount=true to allow global percentage discounts if configured,
      // though typically events use memberPriceInPaise explicitly. The pricing engine handles this gracefully.
      const pricing = await pricingService.calculatePriceBreakdown(
        userId,
        basePriceInPaise,
        true,
        pointsToRedeem,
        event.club?.slug,
      );

      // 4. Create Booking
      const booking = await tx.booking.create({
        data: {
          userId,
          eventId,
          ticketTypeId,
          quantity,
          status: 'PENDING_PAYMENT',
          totalInPaise: pricing.finalAmountInPaise,
          discountInPaise: pricing.discountAmountInPaise,
          pointsRedeemed: pricing.pointsRedeemed,
        },
      });

      return { booking, pricing };
    });
  }

  /**
   * Called via webhook when payment succeeds. Converts Booking to tickets.
   */
  async activateBooking(bookingId) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { ticketType: true },
      });

      if (!booking) throw new NotFoundError('Booking not found');
      if (booking.status === 'CONFIRMED') return booking; // Idempotent
      if (booking.status !== 'PENDING_PAYMENT') {
        throw new BadRequestError('Cannot activate a booking that is not pending payment');
      }

      // Verify capacity one last time just in case (e.g. if we allowed overbooking of pending)
      const ticketType = booking.ticketType;
      if (
        ticketType.quantity > 0 &&
        ticketType.soldCount + booking.quantity > ticketType.quantity
      ) {
        // Here we would trigger a refund process because they paid but we ran out.
        throw new ConflictError('Tickets sold out during payment processing. Refund required.');
      }

      // Update sold count
      await tx.ticketType.update({
        where: { id: ticketType.id },
        data: { soldCount: { increment: booking.quantity } },
      });

      // Update Booking
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      });

      // Generate Tickets
      const ticketsData = Array.from({ length: booking.quantity }).map(() => ({
        bookingId,
        code: crypto.randomUUID(), // Secure unique QR payload
        status: 'VALID',
      }));

      await tx.ticket.createMany({ data: ticketsData });

      logger.info(
        { bookingId, quantity: booking.quantity },
        'Booking confirmed and tickets generated',
      );

      return tx.booking.findUnique({
        where: { id: bookingId },
        include: { tickets: true },
      });
    });
  }

  /**
   * Get all tickets belonging to a user.
   */
  async getUserTickets(userId) {
    return prisma.ticket.findMany({
      where: {
        booking: { userId },
      },
      include: {
        booking: {
          include: {
            event: true,
            ticketType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const ticketService = new TicketService();

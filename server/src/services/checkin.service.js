import prisma from '../config/database.js';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

class CheckInService {
  /**
   * Scans a ticket QR code and marks it as USED.
   */
  async scanTicket(code, scannedByUserId = null, note = '') {
    let cleanCode = String(code || '').trim();
    if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanCode);
        cleanCode = parsed.code || parsed.ticketCode || parsed.ref || parsed.id || cleanCode;
      } catch {}
    }
    if (cleanCode.includes('?') && (cleanCode.includes('code=') || cleanCode.includes('ref='))) {
      try {
        const url = new URL(cleanCode);
        cleanCode =
          url.searchParams.get('code') ||
          url.searchParams.get('ref') ||
          url.searchParams.get('id') ||
          cleanCode;
      } catch {}
    }

    return prisma.$transaction(async (tx) => {
      // Find ticket by QR code or ticket ID
      let ticket = await tx.ticket.findUnique({
        where: { code: cleanCode },
        include: {
          booking: {
            include: {
              user: true,
              event: true,
              ticketType: true,
            },
          },
        },
      });

      if (!ticket) {
        ticket = await tx.ticket.findUnique({
          where: { id: cleanCode },
          include: {
            booking: {
              include: {
                user: true,
                event: true,
                ticketType: true,
              },
            },
          },
        });
      }

      if (!ticket) {
        ticket = await tx.ticket.findFirst({
          where: { bookingId: cleanCode },
          include: {
            booking: {
              include: {
                user: true,
                event: true,
                ticketType: true,
              },
            },
          },
        });
      }

      if (!ticket) {
        throw new NotFoundError('Invalid ticket code');
      }

      if (ticket.status === 'USED') {
        throw new ConflictError('Ticket has already been scanned');
      }

      if (ticket.status !== 'VALID') {
        throw new BadRequestError(`Ticket is ${ticket.status.toLowerCase()}`);
      }

      // Check if event is valid (e.g. not cancelled)
      const event = await tx.event.findUnique({
        where: { id: ticket.booking.eventId },
      });

      if (event.status !== 'PUBLISHED') {
        throw new BadRequestError('Event is not active');
      }

      // Update ticket status
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: 'USED' },
      });

      // Create CheckIn record
      const checkIn = await tx.checkIn.create({
        data: {
          ticket: { connect: { id: ticket.id } },
          checkedBy: scannedByUserId || 'STATION_OPERATOR',
          note: note || undefined,
        },
      });

      logger.info(
        { ticketId: ticket.id, scannedBy: scannedByUserId },
        'Ticket scanned successfully',
      );

      return { ticket, checkIn };
    });
  }

  /**
   * Retrieves list of attendees / tickets for event door verification.
   */
  async getAttendees(eventId = null) {
    const where = {};
    if (eventId && eventId !== 'ALL') {
      where.booking = { eventId };
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            event: { select: { id: true, title: true, location: true, startDate: true } },
            ticketType: { select: { id: true, name: true, priceInPaise: true } },
          },
        },
        checkIn: true,
      },
    });

    return tickets.map((t) => {
      const u = t.booking?.user;
      const name = u ? `${u.firstName} ${u.lastName}`.trim() : 'Guest';
      const isCheckedIn = t.status === 'USED' || Boolean(t.checkIn);
      const isCancelled = t.status === 'CANCELLED';

      let status = 'confirmed';
      if (isCheckedIn) status = 'checked_in';
      else if (isCancelled) status = 'cancelled';

      return {
        id: t.id,
        ref: t.code,
        name,
        email: u?.email || '',
        event: t.booking?.event?.title || 'Campus Event',
        eventId: t.booking?.eventId || '',
        type: t.booking?.ticketType?.name || 'General Admission',
        status,
        checkedInAt: t.checkIn?.createdAt
          ? new Date(t.checkIn.createdAt).toLocaleTimeString('en-IN')
          : null,
      };
    });
  }
}

export const checkInService = new CheckInService();

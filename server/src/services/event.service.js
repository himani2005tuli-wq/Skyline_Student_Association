import { z } from 'zod';
import prisma from '../config/database.js';
import { NotFoundError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

export const EventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  registrationOpen: z.string().datetime().optional(),
  registrationClose: z.string().datetime().optional(),
  capacity: z.number().int().min(1).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED', 'ARCHIVED']).default('PUBLISHED'),
  clubSlug: z.string().optional(),
  clubId: z.string().optional(),
});

class EventService {
  /**
   * Create a new event with its ticket types.
   */
  async createEvent(data, ticketTypes = []) {
    const parsed = EventSchema.parse(data);
    let club = null;
    if (parsed.clubId) {
      club = await prisma.club.findUnique({ where: { id: parsed.clubId } });
    }
    if (!club && parsed.clubSlug) {
      club = await prisma.club.findUnique({ where: { slug: parsed.clubSlug } });
    }
    if (!club) {
      club = await prisma.club.findFirst({ where: { isActive: true } }) || await prisma.club.findFirst();
    }

    if (!club) throw new NotFoundError('Club not found');

    const event = await prisma.event.create({
      data: {
        clubId: club.id,
        title: parsed.title,
        description: parsed.description,
        location: parsed.location,
        startDate: new Date(parsed.startDate),
        endDate: new Date(parsed.endDate),
        registrationOpen: parsed.registrationOpen ? new Date(parsed.registrationOpen) : null,
        registrationClose: parsed.registrationClose ? new Date(parsed.registrationClose) : null,
        capacity: parsed.capacity,
        status: parsed.status,
        ticketTypes: {
          create: ticketTypes.map((tt) => ({
            name: tt.name,
            priceInPaise: tt.priceInPaise,
            memberPriceInPaise: tt.memberPriceInPaise,
            quantity: tt.quantity,
          })),
        },
      },
      include: {
        ticketTypes: true,
      },
    });

    logger.info({ eventId: event.id }, 'Event created');
    return event;
  }

  /**
   * List published events.
   */
  async listPublishedEvents(clubSlug = null, clubId = null) {
    const where = {};
    if (clubId) {
      where.clubId = clubId;
    } else if (clubSlug && clubSlug !== 'all') {
      where.club = { slug: clubSlug };
    }
    return prisma.event.findMany({
      where,
      include: {
        club: { select: { id: true, name: true, slug: true } },
        ticketTypes: true,
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Get specific event by ID.
   */
  async getEventById(eventId) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: true,
      },
    });

    if (!event) throw new NotFoundError('Event not found');
    return event;
  }

  /**
   * Delete event and cascade delete all associated bookings, tickets, check-ins, and ticket types.
   */
  async deleteEvent(eventId) {
    return prisma.$transaction(async (tx) => {
      const bookings = await tx.booking.findMany({
        where: { eventId },
        select: { id: true },
      });
      const bookingIds = bookings.map((b) => b.id);

      if (bookingIds.length > 0) {
        const tickets = await tx.ticket.findMany({
          where: { bookingId: { in: bookingIds } },
          select: { id: true },
        });
        const ticketIds = tickets.map((t) => t.id);

        if (ticketIds.length > 0) {
          await tx.checkIn.deleteMany({
            where: { ticketId: { in: ticketIds } },
          });
          await tx.ticket.deleteMany({
            where: { id: { in: ticketIds } },
          });
        }

        await tx.purchasePricingSnapshot.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });

        await tx.payment.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });

        await tx.booking.deleteMany({
          where: { id: { in: bookingIds } },
        });
      }

      await tx.ticketType.deleteMany({
        where: { eventId },
      });

      return tx.event.delete({
        where: { id: eventId },
      });
    });
  }
}

export const eventService = new EventService();

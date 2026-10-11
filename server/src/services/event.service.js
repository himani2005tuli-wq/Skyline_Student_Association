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
  async createEvent(rawData, rawTicketTypes = []) {
    const data = { ...rawData };
    if (data.date && !data.startDate) {
      data.startDate = new Date(data.date).toISOString();
    }
    if (data.startDate && !data.endDate) {
      data.endDate = new Date(new Date(data.startDate).getTime() + 3 * 60 * 60 * 1000).toISOString();
    }
    if (data.venue && !data.location) {
      data.location = data.venue;
    }
    if (data.desc && !data.description) {
      data.description = data.desc;
    }
    if (data.capacity) {
      data.capacity = Number(data.capacity);
    }

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

    let ticketTypes = Array.isArray(rawTicketTypes) && rawTicketTypes.length > 0 ? [...rawTicketTypes] : [];
    if (ticketTypes.length === 0 && (rawData.memberPrice !== undefined || rawData.guestPrice !== undefined)) {
      const memberPaise = Math.round(Number(rawData.memberPrice || 0) * 100);
      const guestPaise = Math.round(Number(rawData.guestPrice || 0) * 100);
      ticketTypes = [
        {
          name: 'Member Ticket',
          priceInPaise: memberPaise,
          memberPriceInPaise: memberPaise,
          quantity: parsed.capacity || 100,
        },
        {
          name: 'Guest Ticket',
          priceInPaise: guestPaise,
          memberPriceInPaise: memberPaise,
          quantity: parsed.capacity || 100,
        },
      ];
    }

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
   * Update event details.
   */
  async updateEvent(eventId, data) {
    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.desc !== undefined && !data.description) updateData.description = data.desc;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.venue !== undefined && !data.location) updateData.location = data.venue;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.date !== undefined && !data.startDate) updateData.startDate = new Date(data.date);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.capacity !== undefined) updateData.capacity = Number(data.capacity);
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.poster !== undefined && !data.imageUrl) updateData.imageUrl = data.poster;
    if (data.status !== undefined) updateData.status = data.status;

    const event = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        club: { select: { id: true, name: true, slug: true } },
        ticketTypes: true,
      },
    });

    if (data.memberPrice !== undefined || data.guestPrice !== undefined) {
      const memberPaise = Math.round(Number(data.memberPrice || 0) * 100);
      const guestPaise = Math.round(Number(data.guestPrice || 0) * 100);
      if (event.ticketTypes && event.ticketTypes.length >= 2) {
        await prisma.ticketType.update({
          where: { id: event.ticketTypes[0].id },
          data: { priceInPaise: memberPaise, memberPriceInPaise: memberPaise },
        });
        await prisma.ticketType.update({
          where: { id: event.ticketTypes[1].id },
          data: { priceInPaise: guestPaise, memberPriceInPaise: memberPaise },
        });
      } else if (event.ticketTypes && event.ticketTypes.length === 1) {
        await prisma.ticketType.update({
          where: { id: event.ticketTypes[0].id },
          data: { priceInPaise: guestPaise, memberPriceInPaise: memberPaise },
        });
      }
    }

    return prisma.event.findUnique({
      where: { id: eventId },
      include: {
        club: { select: { id: true, name: true, slug: true } },
        ticketTypes: true,
      },
    });
  }

  /**
   * Delete event and cascade delete all associated bookings, tickets, check-ins, and ticket types.
   */
  async deleteEvent(eventId) {
    return prisma.event.delete({
      where: { id: eventId },
    });
  }
}

export const eventService = new EventService();

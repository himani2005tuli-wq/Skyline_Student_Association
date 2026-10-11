import { eventService } from '../services/event.service.js';
import prisma from '../config/database.js';

export async function listEvents(req, res, next) {
  try {
    let { clubSlug, clubId } = req.query;

    let isClubAdmin = false;
    let userClubId = null;

    if (req.user) {
      if (req.user.role === 'CLUB_ADMIN' || req.user.role === 'ADMIN') {
        isClubAdmin = true;
        userClubId = req.user.clubId;
      }
    } else if (req.session?.userId && (req.session.role === 'CLUB_ADMIN' || req.session.role === 'ADMIN')) {
      isClubAdmin = true;
      userClubId = req.session.clubId;
    }

    if (isClubAdmin && !userClubId && (req.user?.id || req.session?.userId)) {
      const u = await prisma.user.findUnique({
        where: { id: req.user?.id || req.session?.userId },
        select: {
          clubId: true,
          memberships: {
            where: { status: 'ACTIVE' },
            select: { plan: { select: { clubId: true } } },
            take: 1,
          },
        },
      });
      userClubId = u?.clubId || u?.memberships?.[0]?.plan?.clubId || null;
    }

    if (isClubAdmin && userClubId) {
      clubId = userClubId;
    }

    const events = await eventService.listPublishedEvents(clubSlug, clubId);
    res.json({ success: true, data: { events } });
  } catch (err) {
    next(err);
  }
}

export async function getEvent(req, res, next) {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.json({ success: true, data: { event } });
  } catch (err) {
    next(err);
  }
}

export async function createEvent(req, res, next) {
  try {
    const { ticketTypes, ...eventData } = req.body;
    let targetClubId = eventData.clubId;
    if (req.user?.role === 'CLUB_ADMIN' || req.user?.role === 'ADMIN') {
      targetClubId = req.user.clubId;
      if (!targetClubId) {
        const u = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: {
            clubId: true,
            memberships: {
              where: { status: 'ACTIVE' },
              select: { plan: { select: { clubId: true } } },
              take: 1,
            },
          },
        });
        targetClubId = u?.clubId || u?.memberships?.[0]?.plan?.clubId || null;
      }
      if (targetClubId) {
        eventData.clubId = targetClubId;
      }
    }
    const event = await eventService.createEvent(eventData, ticketTypes);
    res.status(201).json({ success: true, data: { event } });
  } catch (err) {
    next(err);
  }
}

export async function updateEvent(req, res, next) {
  try {
    const { id } = req.params;
    const event = await eventService.updateEvent(id, req.body);
    res.json({ success: true, data: { event } });
  } catch (err) {
    next(err);
  }
}

export async function deleteEvent(req, res, next) {
  try {
    const { id } = req.params;
    await eventService.deleteEvent(id);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}


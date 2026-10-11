import communicationService from '../services/communication.service.js';
import cronService from '../services/cron.service.js';
import prisma from '../config/database.js';

export async function createAnnouncement(req, res, next) {
  try {
    const payload = { ...req.body };
    let targetClubId = payload.clubId;
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
        payload.clubId = targetClubId;
      }
    }
    const announcement = await communicationService.createAnnouncement(payload);
    res.status(201).json({ success: true, data: { announcement } });
  } catch (err) {
    next(err);
  }
}

export async function getAnnouncements(req, res, next) {
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

    const announcements = await communicationService.getAnnouncements(clubSlug, clubId);
    res.json({ success: true, data: { announcements } });
  } catch (err) {
    next(err);
  }
}

export async function getScheduledAnnouncements(req, res, next) {
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

    const scheduled = await communicationService.getScheduledAnnouncements(clubSlug, clubId);
    const cronStatus = await cronService.getCronStatus();
    res.json({ success: true, data: { scheduled, cronStatus } });
  } catch (err) {
    next(err);
  }
}

export async function cancelScheduledAnnouncement(req, res, next) {
  try {
    const { id } = req.params;
    await communicationService.cancelScheduledAnnouncement(id);
    res.json({ success: true, data: { cancelled: id } });
  } catch (err) {
    next(err);
  }
}

export async function updateAnnouncement(req, res, next) {
  try {
    const { id } = req.params;
    const announcement = await communicationService.updateAnnouncement(id, req.body);
    res.json({ success: true, data: { announcement } });
  } catch (err) {
    next(err);
  }
}

export async function deleteAnnouncement(req, res, next) {
  try {
    const { id } = req.params;
    await communicationService.deleteAnnouncement(id);
    res.json({ success: true, data: { deleted: id } });
  } catch (err) {
    next(err);
  }
}

export async function triggerScheduledCron(req, res, next) {
  try {
    const result = await cronService.runScheduledNotificationCron();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getCronStatus(req, res, next) {
  try {
    const status = await cronService.getCronStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
}

export async function pushDirectNotification(req, res, next) {
  try {
    const payload = { ...req.body };
    let userClubId = req.user?.clubId;

    if (req.user?.role === 'CLUB_ADMIN' && !userClubId) {
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
      userClubId = u?.clubId || u?.memberships?.[0]?.plan?.clubId || null;
    }

    if (req.user?.role === 'CLUB_ADMIN' && userClubId) {
      payload.clubId = userClubId;
    }

    const result = await communicationService.pushNotification(payload);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getMyNotifications(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const data = await communicationService.getUserNotifications(req.user.id, limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    await communicationService.markNotificationAsRead(req.user.id, id);
    res.json({ success: true, data: { id, isRead: true } });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await communicationService.markAllNotificationsAsRead(req.user.id);
    res.json({ success: true, data: { markedAllAsRead: true } });
  } catch (err) {
    next(err);
  }
}

export async function updateMyPreferences(req, res, next) {
  try {
    const { preferences } = req.body;
    const updated = await communicationService.updatePreferences(req.user.id, preferences);
    res.json({ success: true, data: { preferences: updated } });
  } catch (err) {
    next(err);
  }
}

export async function getMyPreferences(req, res, next) {
  try {
    const preferences = await communicationService.getPreferences(req.user.id);
    res.json({ success: true, data: { preferences } });
  } catch (err) {
    next(err);
  }
}

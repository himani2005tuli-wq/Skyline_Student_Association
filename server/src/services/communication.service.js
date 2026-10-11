import { z } from 'zod';
import prisma from '../config/database.js';
import { sendEmail, sendBroadcastEmail } from '../utils/email.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { NotFoundError, BadRequestError } from '../utils/AppError.js';
import logger from '../utils/logger.js';
import socketService from './socket.service.js';

export const AnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  audience: z.any().optional(),
  isPublished: z.boolean().default(false),
  clubSlug: z.string().optional(),
  clubId: z.string().optional(),
  scheduledFor: z.union([z.string(), z.date()]).optional().nullable(),
  cronPattern: z.string().optional().nullable(),
  channels: z.array(z.enum(['EMAIL', 'WHATSAPP', 'IN_APP'])).default(['EMAIL', 'IN_APP']),
});

export const PushNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.string().default('ANNOUNCEMENT'),
  link: z.string().optional().nullable().or(z.literal('')),
  clubId: z.string().optional().nullable(),
  userIds: z.array(z.string()).optional(), // specific users or all active if omitted
});

class CommunicationService {
  /**
   * Create an announcement (immediate or scheduled).
   */
  async createAnnouncement(data) {
    const parsed = AnnouncementSchema.parse(data);
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

    let isScheduled = false;
    let scheduledDate = null;

    if (parsed.scheduledFor) {
      scheduledDate = new Date(parsed.scheduledFor);
      if (scheduledDate > new Date()) {
        isScheduled = true;
      }
    }

    const shouldPublishNow = !isScheduled && parsed.isPublished;

    const announcement = await prisma.announcement.create({
      data: {
        clubId: club.id,
        title: parsed.title,
        content: parsed.content,
        audience: parsed.audience || { channels: parsed.channels },
        isPublished: shouldPublishNow,
        publishedAt: shouldPublishNow ? new Date() : null,
        scheduledFor: isScheduled ? scheduledDate : null,
        cronPattern: parsed.cronPattern || null,
      },
    });

    if (shouldPublishNow) {
      this.dispatchAnnouncement(announcement.id, parsed.channels).catch((err) => {
        logger.error(
          { err: err.message, announcementId: announcement.id },
          'Failed async announcement dispatch',
        );
      });
    }

    return announcement;
  }

  /**
   * Dispatches the announcement to members across selected channels (Email, WhatsApp, In-App).
   */
  async dispatchAnnouncement(announcementId, preferredChannels = null) {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: { club: true },
    });

    if (!announcement) return;

    // Mark as published
    if (!announcement.isPublished) {
      await prisma.announcement.update({
        where: { id: announcementId },
        data: {
          isPublished: true,
          publishedAt: new Date(),
        },
      });
    }

    const channels = preferredChannels ||
      (announcement.audience && announcement.audience.channels) || ['EMAIL', 'IN_APP'];

    logger.info(
      { announcementId, title: announcement.title, channels },
      '🚀 Dispatching announcement notification',
    );

    const isPlatform = announcement.audience?.scope === 'PLATFORM' || announcement.audience?.isPlatform === true;
    const targetUserCondition = !isPlatform && announcement.clubId ? {
      isActive: true,
      OR: [
        { clubId: announcement.clubId },
        { memberships: { some: { plan: { clubId: announcement.clubId } } } },
      ],
    } : { isActive: true };

    // 1. In-App Notifications: Create notification records for targeted active users
    if (channels.includes('IN_APP')) {
      try {
        const users = await prisma.user.findMany({
          where: targetUserCondition,
          select: { id: true },
        });

        if (users.length > 0) {
          await prisma.notification.createMany({
            data: users.map((u) => ({
              userId: u.id,
              title: announcement.title,
              message: announcement.content.slice(0, 300),
              type: 'ANNOUNCEMENT',
              link: '/announcements',
            })),
          });
          logger.info({ count: users.length, clubId: announcement.clubId }, 'In-app notifications delivered to chapter audience');

          // Broadcast real-time notification via Socket.IO
          socketService.emitToAll('notification:new', {
            title: announcement.title,
            message: announcement.content.slice(0, 300),
            type: 'ANNOUNCEMENT',
            link: '/announcements',
            clubId: announcement.clubId,
            scope: isPlatform ? 'PLATFORM' : 'CLUB',
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        logger.error({ err: err.message }, 'Failed to create in-app notifications');
      }
    }

    // 2. Email Notifications: Broadcast via Nodemailer to targeted active audience
    if (channels.includes('EMAIL')) {
      const clubName = announcement.club?.name || 'Skyline Student Association';

      // Exclude users who explicitly unsubscribed from email
      const optedOutSubs = await prisma.mailingListSubscription.findMany({
        where: { channel: 'EMAIL', isSubscribed: false },
        select: { userId: true },
      });
      const optedOutUserIds = new Set(optedOutSubs.map((s) => s.userId).filter(Boolean));

      // Retrieve all active members targeted by the announcement
      const targetUsers = await prisma.user.findMany({
        where: targetUserCondition,
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      // Filter out explicitly opted-out users
      const recipients = targetUsers.filter((u) => u.email && !optedOutUserIds.has(u.id));

      logger.info(
        { count: recipients.length, announcementId, clubName },
        '📧 Broadcasting announcement via Nodemailer',
      );

      for (const u of recipients) {
        try {
          const mailRes = await sendBroadcastEmail({
            to: u.email,
            recipientName: u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : '',
            subject: `📢 [${clubName}] ${announcement.title}`,
            announcementTitle: announcement.title,
            content: announcement.content,
            clubName,
            announcementId,
          });

          await prisma.notificationDelivery.create({
            data: {
              announcementId,
              recipientEmail: u.email,
              channel: 'EMAIL',
              status: 'SENT',
            },
          });
        } catch (err) {
          logger.warn(
            { err: err.message, email: u.email },
            'Failed to dispatch broadcast email to recipient',
          );
          await prisma.notificationDelivery.create({
            data: {
              announcementId,
              recipientEmail: u.email,
              channel: 'EMAIL',
              status: 'FAILED',
              errorMessage: err.message,
            },
          });
        }
      }
    }

    // 3. WhatsApp Notifications: Dispatch via Meta Cloud API
    if (channels.includes('WHATSAPP')) {
      const waUsers = await prisma.user.findMany({
        where: {
          phone: { not: null },
          ...targetUserCondition,
        },
        select: { id: true, phone: true },
      });

      for (const u of waUsers) {
        try {
          await sendWhatsApp({
            to: u.phone,
            templateName: 'announcement_alert',
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: announcement.title }],
              },
            ],
          });

          await prisma.notificationDelivery.create({
            data: {
              announcementId,
              recipientPhone: u.phone,
              channel: 'WHATSAPP',
              status: 'SENT',
            },
          });
        } catch (err) {
          logger.warn({ err: err.message, phone: u.phone }, 'WhatsApp dispatch failed');
        }
      }
    }
  }

  /**
   * List announcements scheduled for future cron execution.
   */
  async getScheduledAnnouncements(clubSlug = null, clubId = null) {
    const where = {
      isPublished: false,
      scheduledFor: { not: null },
    };
    if (clubId) {
      where.clubId = clubId;
    } else if (clubSlug && clubSlug !== 'all') {
      where.club = { slug: clubSlug };
    }
    return prisma.announcement.findMany({
      where,
      include: {
        club: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  /**
   * Cancel or delete a scheduled announcement.
   */
  async cancelScheduledAnnouncement(id) {
    return prisma.$transaction(async (tx) => {
      await tx.notificationDelivery.deleteMany({
        where: { announcementId: id },
      });
      return tx.announcement.delete({
        where: { id },
      });
    });
  }

  /**
   * Permanently delete any announcement (published or draft) with cascading deliveries.
   */
  async deleteAnnouncement(id) {
    return prisma.$transaction(async (tx) => {
      await tx.notificationDelivery.deleteMany({
        where: { announcementId: id },
      });
      return tx.announcement.delete({
        where: { id },
      });
    });
  }

  /**
   * Push direct in-app notifications to users.
   */
  async pushNotification(payload) {
    const parsed = PushNotificationSchema.parse(payload);
    const targetClubId = (payload.clubId && payload.clubId !== 'platform' && payload.clubId !== 'all') ? payload.clubId : null;

    let targetUserIds = parsed.userIds;
    if (!targetUserIds || targetUserIds.length === 0) {
      const userCondition = targetClubId ? {
        isActive: true,
        OR: [
          { clubId: targetClubId },
          { memberships: { some: { plan: { clubId: targetClubId } } } },
        ],
      } : { isActive: true };

      let targetedUsers = await prisma.user.findMany({
        where: userCondition,
        select: { id: true },
      });

      // If club has no members yet, fallback to all active users so alert is delivered
      if (targetedUsers.length === 0) {
        targetedUsers = await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true },
        });
      }

      targetUserIds = targetedUsers.map((u) => u.id);
    }

    if (targetUserIds.length === 0) {
      return { count: 0 };
    }

    const created = await prisma.notification.createMany({
      data: targetUserIds.map((userId) => ({
        userId,
        title: parsed.title,
        message: parsed.message,
        type: parsed.type,
        link: parsed.link || null,
      })),
    });

    logger.info(
      { count: created.count, title: parsed.title },
      'Direct push notification sent to users',
    );

    // Broadcast real-time notification to all connected clients or targeted users via Socket.IO
    const notifData = {
      title: parsed.title,
      message: parsed.message,
      type: parsed.type,
      link: parsed.link || null,
      createdAt: new Date().toISOString(),
    };

    socketService.emitToAll('notification:new', notifData);

    return created;
  }

  /**
   * Get inbox notifications for a specific user.
   */
  async getUserNotifications(userId, limit = 20) {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { notifications, unreadCount };
  }

  /**
   * Mark a single notification as read.
   */
  async markNotificationAsRead(userId, notificationId) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllNotificationsAsRead(userId) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Update user's channel subscription preferences.
   */
  async updatePreferences(userId, preferences) {
    if (!Array.isArray(preferences)) {
      throw new BadRequestError('Preferences must be an array');
    }

    const results = [];
    for (const pref of preferences) {
      const updated = await prisma.mailingListSubscription.upsert({
        where: {
          userId_channel: {
            userId,
            channel: pref.channel,
          },
        },
        update: {
          isSubscribed: pref.isSubscribed,
        },
        create: {
          userId,
          channel: pref.channel,
          isSubscribed: pref.isSubscribed,
          consentGivenAt: pref.isSubscribed ? new Date() : null,
        },
      });
      results.push(updated);
    }

    return results;
  }

  async getPreferences(userId) {
    return prisma.mailingListSubscription.findMany({
      where: { userId },
    });
  }

  async getAnnouncements(clubSlug = null, clubId = null) {
    const where = { isPublished: true };
    if (clubId) {
      where.clubId = clubId;
    } else if (clubSlug && clubSlug !== 'all') {
      where.club = { slug: clubSlug };
    }
    return prisma.announcement.findMany({
      where,
      include: {
        club: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const communicationService = new CommunicationService();
export default communicationService;

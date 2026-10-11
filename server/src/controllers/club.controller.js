import prisma from '../config/database.js';
import { extractToken, verifyToken } from '../utils/jwt.js';

export async function listClubs(req, res, next) {
  try {
    let isSuperAdmin = false;
    let isClubAdmin = false;
    let userClubId = null;

    const token = extractToken(req);
    if (token) {
      const decoded = verifyToken(token);
      if (decoded?.role === 'SUPER_ADMIN') isSuperAdmin = true;
      if (decoded?.role === 'CLUB_ADMIN' || decoded?.role === 'ADMIN') {
        isClubAdmin = true;
        userClubId = decoded?.clubId;
      }
    }
    if (req.session?.userId) {
      if (req.session?.role === 'SUPER_ADMIN') isSuperAdmin = true;
      if (req.session?.role === 'CLUB_ADMIN' || req.session?.role === 'ADMIN') {
        isClubAdmin = true;
        if (!userClubId) userClubId = req.session?.clubId;
      }
    }
    if (req.user) {
      if (req.user.role === 'SUPER_ADMIN') isSuperAdmin = true;
      if (req.user.role === 'CLUB_ADMIN' || req.user.role === 'ADMIN') {
        isClubAdmin = true;
        if (!userClubId) userClubId = req.user.clubId;
      }
    }

    // Fallback: If club admin but userClubId wasn't in token/session, look up in DB
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

    const { all } = req.query;
    let where = isSuperAdmin || all === 'true' ? {} : { isActive: true };

    // If Club Admin, filter ONLY to their club
    if (isClubAdmin && userClubId) {
      where = { id: userClubId };
    }

    const clubs = await prisma.club.findMany({
      where,
      include: {
        _count: {
          select: {
            events: true,
            membershipPlans: true,
            products: true,
            announcements: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: { clubs } });
  } catch (err) {
    next(err);
  }
}

export async function getClub(req, res, next) {
  try {
    const { id } = req.params;
    const club = await prisma.club.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        membershipPlans: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        events: {
          take: 6,
          orderBy: { startDate: 'asc' },
        },
        announcements: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            events: true,
            membershipPlans: true,
            products: true,
            announcements: true,
          },
        },
      },
    });

    if (!club) {
      return res.status(404).json({ success: false, error: 'Club not found' });
    }

    res.json({ success: true, data: { club } });
  } catch (err) {
    next(err);
  }
}

export async function createClub(req, res, next) {
  try {
    const { name, slug, description, logoUrl, isActive } = req.body;
    const club = await prisma.club.create({
      data: {
        name,
        slug,
        description,
        logoUrl: logoUrl || null,
        isActive: isActive ?? true,
      },
    });
    res.status(201).json({ success: true, data: { club } });
  } catch (err) {
    next(err);
  }
}

export async function updateClub(req, res, next) {
  try {
    const { id } = req.params;
    const { name, slug, description, logoUrl, isActive } = req.body;
    const club = await prisma.club.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        isActive,
      },
    });
    res.json({ success: true, data: { club } });
  } catch (err) {
    next(err);
  }
}

export async function deleteClub(req, res, next) {
  try {
    const { id } = req.params;

    await prisma.$transaction(async (tx) => {
      // 1. Volunteer Tasks & Assignments
      const fundraisers = await tx.fundraiser.findMany({
        where: { clubId: id },
        select: { id: true },
      });
      const fundraiserIds = fundraisers.map((f) => f.id);
      if (fundraiserIds.length > 0) {
        const tasks = await tx.volunteerTask.findMany({
          where: { fundraiserId: { in: fundraiserIds } },
          select: { id: true },
        });
        const taskIds = tasks.map((t) => t.id);
        if (taskIds.length > 0) {
          await tx.taskAssignment.deleteMany({
            where: { taskId: { in: taskIds } },
          });
          await tx.volunteerTask.deleteMany({
            where: { id: { in: taskIds } },
          });
        }
        await tx.fundraiser.deleteMany({
          where: { id: { in: fundraiserIds } },
        });
      }

      // 2. Events & Ticketing
      const events = await tx.event.findMany({
        where: { clubId: id },
        select: { id: true },
      });
      const eventIds = events.map((e) => e.id);
      if (eventIds.length > 0) {
        const bookings = await tx.booking.findMany({
          where: { eventId: { in: eventIds } },
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
          where: { eventId: { in: eventIds } },
        });
        await tx.event.deleteMany({
          where: { id: { in: eventIds } },
        });
      }

      // 3. Products & Merchandise
      const products = await tx.product.findMany({
        where: { clubId: id },
        select: { id: true },
      });
      const productIds = products.map((p) => p.id);
      if (productIds.length > 0) {
        const variants = await tx.productVariant.findMany({
          where: { productId: { in: productIds } },
          select: { id: true },
        });
        const variantIds = variants.map((v) => v.id);
        if (variantIds.length > 0) {
          await tx.inventoryMovement.deleteMany({
            where: { variantId: { in: variantIds } },
          });
          await tx.orderItem.deleteMany({
            where: { variantId: { in: variantIds } },
          });
          await tx.productVariant.deleteMany({
            where: { id: { in: variantIds } },
          });
        }
        await tx.product.deleteMany({
          where: { id: { in: productIds } },
        });
      }

      // 4. Announcements & Deliveries
      const announcements = await tx.announcement.findMany({
        where: { clubId: id },
        select: { id: true },
      });
      const announcementIds = announcements.map((a) => a.id);
      if (announcementIds.length > 0) {
        await tx.notificationDelivery.deleteMany({
          where: { announcementId: { in: announcementIds } },
        });
        await tx.announcement.deleteMany({
          where: { id: { in: announcementIds } },
        });
      }

      // 5. Membership Plans & Memberships
      const plans = await tx.membershipPlan.findMany({
        where: { clubId: id },
        select: { id: true },
      });
      const planIds = plans.map((p) => p.id);
      if (planIds.length > 0) {
        const memberships = await tx.membership.findMany({
          where: { planId: { in: planIds } },
          select: { id: true },
        });
        const membershipIds = memberships.map((m) => m.id);
        if (membershipIds.length > 0) {
          await tx.membershipPayment.deleteMany({
            where: { membershipId: { in: membershipIds } },
          });
          await tx.membership.deleteMany({
            where: { id: { in: membershipIds } },
          });
        }
        await tx.membershipPlan.deleteMany({
          where: { id: { in: planIds } },
        });
      }

      // 6. Discount Rules
      await tx.discountRule.deleteMany({
        where: { clubId: id },
      });

      // 7. Detach optional references
      await tx.expense.updateMany({
        where: { clubId: id },
        data: { clubId: null },
      });
      await tx.financialTransaction.updateMany({
        where: { clubId: id },
        data: { clubId: null },
      });

      // 8. Delete the Club
      await tx.club.delete({
        where: { id },
      });
    });

    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}


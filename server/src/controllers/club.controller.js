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
      // Detach optional non-foreign-key columns
      await tx.expense.updateMany({
        where: { clubId: id },
        data: { clubId: null },
      });
      await tx.financialTransaction.updateMany({
        where: { clubId: id },
        data: { clubId: null },
      });

      // Delete the Club (PostgreSQL cascade deletes all related plans, events, products, fundraisers, announcements, and discounts)
      await tx.club.delete({
        where: { id },
      });
    });

    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}


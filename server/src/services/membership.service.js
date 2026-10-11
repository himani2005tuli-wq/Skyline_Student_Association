import { z } from 'zod';
import prisma from '../config/database.js';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

export const MembershipPlanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  priceInPaise: z.number().int().min(0, 'Price must be positive'),
  durationDays: z.number().int().min(1, 'Duration must be at least 1 day'),
  benefits: z.record(z.any()).optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

class MembershipService {
  /**
   * Get all active membership plans for all clubs or a specific club
   */
  async getPlans(clubSlug = null) {
    const where = { isActive: true };
    if (clubSlug) {
      where.club = { slug: clubSlug };
    }

    return prisma.membershipPlan.findMany({
      where,
      include: {
        club: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            description: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { priceInPaise: 'asc' }],
    });
  }

  /**
   * Get current active membership for a user (across all clubs or for a specific club)
   */
  async getActiveMembership(userId, clubIdOrSlug = null) {
    const where = {
      userId,
      status: 'ACTIVE',
      expiryDate: { gt: new Date() },
    };

    if (clubIdOrSlug) {
      where.plan = {
        OR: [
          { clubId: clubIdOrSlug },
          { club: { slug: clubIdOrSlug } },
        ],
      };
    }

    return prisma.membership.findFirst({
      where,
      include: {
        plan: {
          include: {
            club: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all active memberships for a user across all clubs
   */
  async getAllActiveMemberships(userId) {
    return prisma.membership.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        expiryDate: { gt: new Date() },
      },
      include: {
        plan: {
          include: {
            club: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Start a new membership or renewal.
   * Creates and activates the membership, records payment, and logs dues to club ledger.
   */
  async initiateSubscription(userId, planId, renewedFromId = null, autoActivate = true) {
    const plan = await prisma.membershipPlan.findUnique({
      where: { id: planId },
      include: { club: true },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundError('Membership plan not found or inactive');
    }

    // Check if user already has an active membership for this club
    const active = await this.getActiveMembership(userId, plan.clubId);
    if (active && !renewedFromId) {
      throw new ConflictError(`User already has an active membership for ${plan.club?.name || 'this club'}`);
    }

    if (autoActivate) {
      const now = new Date();
      const expiry = new Date(now);
      expiry.setDate(expiry.getDate() + (plan.durationDays || 365));

      const membership = await prisma.membership.create({
        data: {
          userId,
          planId,
          status: 'ACTIVE',
          startDate: now,
          expiryDate: expiry,
          renewedFromId,
        },
        include: {
          plan: {
            include: {
              club: true,
            },
          },
        },
      });

      // Record membership payment entry
      try {
        await prisma.membershipPayment.create({
          data: {
            membershipId: membership.id,
            amountInPaise: plan.priceInPaise,
            pointsUsed: 0,
          },
        });
      } catch (err) {
        logger.warn({ err: err.message }, 'Failed to record membership payment log');
      }

      // Log transaction into club treasury ledger
      try {
        const { ledgerService } = await import('./ledger.service.js');
        await ledgerService.logTransaction({
          category: 'MEMBERSHIP_DUES',
          amountInPaise: plan.priceInPaise,
          description: `Membership dues: ${plan.name} (${plan.club?.name || 'Club'})`,
          referenceType: 'MEMBERSHIP',
          referenceId: membership.id,
          clubId: plan.clubId,
        });
      } catch (err) {
        logger.warn({ err: err.message }, 'Failed to log membership dues to ledger');
      }

      // Credit welcome points to loyalty account
      try {
        const { loyaltyService } = await import('./loyalty.service.js');
        await loyaltyService.creditPoints(userId, 50, `Welcome bonus for subscribing to ${plan.club?.name || 'club'}`);
      } catch (err) {
        logger.debug({ err: err.message }, 'Loyalty points credit skipped or unavailable');
      }

      logger.info({ membershipId: membership.id, userId, clubId: plan.clubId }, 'Membership auto-activated successfully');
      return membership;
    }

    // Fallback: create pending membership request
    const membership = await prisma.membership.create({
      data: {
        userId,
        planId,
        status: 'PENDING',
        renewedFromId,
      },
      include: {
        plan: {
          include: {
            club: true,
          },
        },
      },
    });

    return membership;
  }

  /**
   * Called by payment webhook when payment succeeds to activate the membership.
   */
  async activateMembership(membershipId) {
    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: { plan: { include: { club: true } } },
    });

    if (!membership) {
      throw new NotFoundError('Membership not found');
    }

    if (membership.status === 'ACTIVE') {
      return membership; // Idempotent
    }

    if (membership.status !== 'PENDING') {
      throw new BadRequestError('Cannot activate a membership that is not pending');
    }

    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + (membership.plan.durationDays || 365));

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: {
        status: 'ACTIVE',
        startDate: now,
        expiryDate: expiry,
      },
      include: {
        plan: {
          include: {
            club: true,
          },
        },
      },
    });

    logger.info({ membershipId, userId: membership.userId }, 'Membership activated');
    return updated;
  }

  /**
   * Fetch active discount rules for a club.
   */
  async getActiveDiscountRule(clubSlug = 'campus-tech-society') {
    return prisma.discountRule.findFirst({
      where: {
        club: { slug: clubSlug },
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const membershipService = new MembershipService();

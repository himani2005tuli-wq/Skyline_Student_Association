import prisma from '../config/database.js';
import { membershipService } from '../services/membership.service.js';
import { pricingService } from '../services/pricing.service.js';
import { invalidateCache } from '../utils/cache.js';

export async function getPlans(req, res, next) {
  try {
    const { clubSlug } = req.query;
    const plans = await membershipService.getPlans(clubSlug || null);
    res.json({ success: true, data: { plans } });
  } catch (err) {
    next(err);
  }
}

export async function getMyStatus(req, res, next) {
  try {
    const membership = await membershipService.getActiveMembership(req.user.id);
    const memberships = await membershipService.getAllActiveMemberships(req.user.id);
    res.json({ success: true, data: { membership, memberships } });
  } catch (err) {
    next(err);
  }
}

export async function initiateSubscription(req, res, next) {
  try {
    const { planId, pointsToRedeem } = req.body;

    // Check pricing using pricing engine
    const plan = await prisma.membershipPlan.findUnique({
      where: { id: planId },
      include: { club: true },
    });
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, error: { message: 'Membership plan not found' } });
    }

    const pricing = await pricingService.calculatePriceBreakdown(
      req.user.id,
      plan.priceInPaise,
      false, // Memberships themselves are not eligible for member discounts
      pointsToRedeem || 0,
    );

    // Create and activate membership
    const membership = await membershipService.initiateSubscription(req.user.id, planId, null, true);

    // Invalidate profile cache so user immediately sees active badge & discounts
    await invalidateCache(`user:profile:${req.user.id}`);
    await invalidateCache('plans');

    res.status(201).json({
      success: true,
      data: {
        membership,
        pricing,
        message: 'Membership activated successfully',
        checkoutUrl: 'https://mock.gateway/checkout',
      },
    });
  } catch (err) {
    next(err);
  }
}

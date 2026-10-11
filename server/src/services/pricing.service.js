import { membershipService } from './membership.service.js';
import { loyaltyService } from './loyalty.service.js';
import { BadRequestError } from '../utils/AppError.js';

class PricingService {
  /**
   * Shared logic to calculate final cart/order price and points breakdown.
   * Can be used for Tickets, Merchandise, or Memberships.
   *
   * @param {string} userId - ID of the purchaser
   * @param {number} rawTotalInPaise - The sum of all items before discounts
   * @param {boolean} itemsEligibleForDiscount - Are items eligible for member discounts?
   * @param {number} requestedPointsToRedeem - Points user wants to spend
   * @param {string} clubSlug - Club identifier for config
   */
  async calculatePriceBreakdown(
    userId,
    rawTotalInPaise,
    itemsEligibleForDiscount,
    requestedPointsToRedeem = 0,
    clubSlug = 'campus-tech-society',
  ) {
    let finalAmountInPaise = rawTotalInPaise;
    let discountAmountInPaise = 0;

    // 1. Fetch user status and club config
    const activeMembership = await membershipService.getActiveMembership(userId, clubSlug);
    const rule = await membershipService.getActiveDiscountRule(clubSlug);
    const loyalty = await loyaltyService.getBalance(userId);

    // 2. Apply Member Discounts (if eligible and active)
    if (itemsEligibleForDiscount && activeMembership && rule && rule.requiresActiveMembership) {
      if (rawTotalInPaise >= rule.minPurchaseInPaise) {
        if (rule.discountType === 'PERCENTAGE') {
          discountAmountInPaise = Math.floor(rawTotalInPaise * (rule.discountValue / 100));
        } else if (rule.discountType === 'FIXED_AMOUNT') {
          discountAmountInPaise = Math.min(rule.discountValue, rawTotalInPaise);
        }

        // Don't let discount exceed total
        finalAmountInPaise = Math.max(0, rawTotalInPaise - discountAmountInPaise);
      }
    }

    // 3. Apply Point Redemption
    let pointsRedeemed = 0;
    let pointDiscountInPaise = 0;

    if (requestedPointsToRedeem > 0) {
      if (!rule) throw new BadRequestError('Loyalty rewards are currently disabled');
      if (loyalty.balance < requestedPointsToRedeem) {
        throw new BadRequestError(`You only have ${loyalty.balance} points available`);
      }
      if (requestedPointsToRedeem < rule.minRedemptionPoints) {
        throw new BadRequestError(`Minimum redemption is ${rule.minRedemptionPoints} points`);
      }

      const calculatedPointValue = requestedPointsToRedeem * rule.pointValueInPaise;

      // Enforce max percentage coverage
      const maxCoverageAmount = Math.floor(finalAmountInPaise * (rule.maxRedemptionPercent / 100));

      // Unless full coverage is allowed
      const allowedCoverage = rule.allowFullPointsCoverage ? finalAmountInPaise : maxCoverageAmount;

      if (calculatedPointValue > allowedCoverage) {
        throw new BadRequestError(
          `Points exceed maximum permitted coverage of ${rule.maxRedemptionPercent}%`,
        );
      }

      pointsRedeemed = requestedPointsToRedeem;
      pointDiscountInPaise = calculatedPointValue;
      finalAmountInPaise = Math.max(0, finalAmountInPaise - pointDiscountInPaise);
    }

    // 4. Calculate Points to Earn
    let pointsEarned = 0;
    if (rule && rule.membersEarnPoints && finalAmountInPaise > 0) {
      const eligibleAmountForEarning = rule.earnOnPreDiscount
        ? rawTotalInPaise
        : finalAmountInPaise;
      pointsEarned = Math.floor(eligibleAmountForEarning / 100) * rule.pointsPerHundred;
    }

    return {
      rawTotalInPaise,
      discountAmountInPaise,
      pointsRedeemed,
      pointDiscountInPaise,
      finalAmountInPaise,
      pointsEarned,
      isMemberApplied: !!activeMembership,
    };
  }
}

export const pricingService = new PricingService();

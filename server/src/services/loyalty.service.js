import prisma from '../config/database.js';
import { BadRequestError, NotFoundError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

class LoyaltyService {
  /**
   * Get user's loyalty balance and summary.
   */
  async getBalance(userId) {
    const account = await prisma.loyaltyAccount.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!account) {
      // Auto-create if missing for some reason
      return prisma.loyaltyAccount.create({
        data: { userId, balance: 0 },
        include: {
          transactions: true,
        },
      });
    }

    return account;
  }

  /**
   * Earn points for a successful purchase.
   * Handles idempotency internally.
   */
  async earnPoints(userId, points, referenceType, referenceId, idempotencyKey, expiryDays = 365) {
    if (points <= 0) return null;

    // Use transaction with SELECT FOR UPDATE to safely modify balance
    return prisma.$transaction(async (tx) => {
      // 1. Check idempotency
      if (idempotencyKey) {
        const existing = await tx.loyaltyTransaction.findUnique({
          where: { idempotencyKey },
        });
        if (existing) return existing; // Idempotent success
      }

      // 2. Lock account
      const [account] = await tx.$queryRaw`
        SELECT id, balance, "lifetimeEarned" 
        FROM "LoyaltyAccount" 
        WHERE "userId" = ${userId} 
        FOR UPDATE
      `;

      if (!account) {
        throw new NotFoundError('Loyalty account not found');
      }

      const newBalance = account.balance + points;
      const newLifetime = account.lifetimeEarned + points;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      // 3. Update account
      await tx.$executeRaw`
        UPDATE "LoyaltyAccount"
        SET balance = ${newBalance}, "lifetimeEarned" = ${newLifetime}, "updatedAt" = NOW()
        WHERE id = ${account.id}
      `;

      // 4. Create ledger entry
      const transaction = await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: 'EARN',
          points,
          balanceAfter: newBalance,
          description: `Earned points from ${referenceType.toLowerCase()}`,
          referenceType,
          referenceId,
          idempotencyKey,
          expiresAt,
        },
      });

      logger.info({ userId, points, transactionId: transaction.id }, 'Points earned');
      return transaction;
    });
  }

  /**
   * Redeem points toward a purchase.
   * Thread-safe and prevents negative balances.
   */
  async redeemPoints(userId, points, amountInPaise, referenceData = {}, idempotencyKey) {
    if (points <= 0) throw new BadRequestError('Points must be greater than zero');

    return prisma.$transaction(async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.loyaltyTransaction.findUnique({
          where: { idempotencyKey },
          include: { redemption: true },
        });
        if (existing) return existing;
      }

      // Lock account
      const [account] = await tx.$queryRaw`
        SELECT id, balance, "lifetimeRedeemed" 
        FROM "LoyaltyAccount" 
        WHERE "userId" = ${userId} 
        FOR UPDATE
      `;

      if (!account) {
        throw new NotFoundError('Loyalty account not found');
      }

      if (account.balance < points) {
        throw new BadRequestError('Insufficient loyalty points');
      }

      const newBalance = account.balance - points;
      const newLifetime = account.lifetimeRedeemed + points;

      await tx.$executeRaw`
        UPDATE "LoyaltyAccount"
        SET balance = ${newBalance}, "lifetimeRedeemed" = ${newLifetime}, "updatedAt" = NOW()
        WHERE id = ${account.id}
      `;

      const transaction = await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: 'REDEEM',
          points: -points, // Negative for redemption
          balanceAfter: newBalance,
          description: 'Redeemed points',
          referenceType: referenceData.type || 'ORDER',
          referenceId: referenceData.id || null,
          idempotencyKey,
          redemption: {
            create: {
              orderId: referenceData.type === 'ORDER' ? referenceData.id : null,
              bookingId: referenceData.type === 'BOOKING' ? referenceData.id : null,
              membershipId: referenceData.type === 'MEMBERSHIP' ? referenceData.id : null,
              amountInPaise,
            },
          },
        },
      });

      logger.info({ userId, points, transactionId: transaction.id }, 'Points redeemed');
      return transaction;
    });
  }

  /**
   * Reverse points earned on a refunded purchase.
   */
  async reversePoints(referenceType, referenceId, idempotencyKey) {
    return prisma.$transaction(async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.loyaltyTransaction.findUnique({
          where: { idempotencyKey },
        });
        if (existing) return existing;
      }

      // Find the original EARN transaction
      const originalTransaction = await tx.loyaltyTransaction.findFirst({
        where: { type: 'EARN', referenceType, referenceId },
        include: { account: true },
      });

      if (!originalTransaction) return null; // Nothing to reverse

      const pointsToReverse = originalTransaction.points;

      const [account] = await tx.$queryRaw`
        SELECT id, balance 
        FROM "LoyaltyAccount" 
        WHERE id = ${originalTransaction.accountId} 
        FOR UPDATE
      `;

      // Deduct points, allowing balance to go negative if they already spent them.
      // (Or we could clamp to 0 based on org policy. Here we allow negative to show debt).
      const newBalance = account.balance - pointsToReverse;

      await tx.$executeRaw`
        UPDATE "LoyaltyAccount"
        SET balance = ${newBalance}, "updatedAt" = NOW()
        WHERE id = ${account.id}
      `;

      const reversal = await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: 'REVERSAL',
          points: -pointsToReverse,
          balanceAfter: newBalance,
          description: `Reversed points for refunded ${referenceType.toLowerCase()}`,
          referenceType,
          referenceId,
          idempotencyKey,
        },
      });

      logger.info({ accountId: account.id, points: pointsToReverse }, 'Points reversed');
      return reversal;
    });
  }
}

export const loyaltyService = new LoyaltyService();

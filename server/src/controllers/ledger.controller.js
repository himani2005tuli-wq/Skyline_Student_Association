import { ledgerService } from '../services/ledger.service.js';
import prisma from '../config/database.js';

export async function getClubLedger(req, res, next) {
  try {
    const { clubId, category, startDate, endDate, direction, limit } = req.query;
    // If the logged in user is associated with a specific club (e.g. club treasurer), use it unless SUPER_ADMIN passes clubId
    const targetClubId =
      clubId === 'ALL'
        ? null
        : clubId || (req.user?.role === 'SUPER_ADMIN' ? null : req.user?.clubId);

    const summary = await ledgerService.getClubBalance(targetClubId);
    const transactions = await ledgerService.getRecentTransactions(
      targetClubId,
      limit ? parseInt(limit, 10) : 100,
      { category, startDate, endDate, direction, clubId: targetClubId },
    );

    res.json({
      success: true,
      data: {
        summary,
        transactions,
      },
    });
  } catch (err) {
    next(err);
  }
}

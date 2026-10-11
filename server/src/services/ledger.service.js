import prisma from '../config/database.js';
import logger from '../utils/logger.js';

class LedgerService {
  /**
   * Log a financial transaction to the ledger.
   * Typically called inside a transaction (tx) to ensure atomicity with business logic.
   */
  async logTransaction(
    { category, amountInPaise, description, referenceType, referenceId, clubId },
    tx = prisma,
  ) {
    const entry = await tx.financialTransaction.create({
      data: {
        category,
        amountInPaise,
        description,
        referenceType,
        referenceId,
        clubId,
      },
    });

    logger.info({ category, amountInPaise, referenceType, referenceId }, 'Ledger entry recorded');
    return entry;
  }

  /**
   * Get total balance and comprehensive financial summary for a club (or entire association if null).
   */
  async getClubBalance(clubId = null) {
    const where = {};
    if (clubId) where.clubId = clubId;

    const incomeCategories = [
      'MEMBERSHIP_DUES',
      'TICKET_INCOME',
      'MERCHANDISE_SALES',
      'FUNDRAISER_INCOME',
      'DONATION',
    ];
    const outflowCategories = ['EXPENSE', 'REIMBURSEMENT', 'REFUND', 'PAYMENT_FEE'];

    const income = await prisma.financialTransaction.aggregate({
      where: { ...where, category: { in: incomeCategories } },
      _sum: { amountInPaise: true },
    });

    const outflow = await prisma.financialTransaction.aggregate({
      where: { ...where, category: { in: outflowCategories } },
      _sum: { amountInPaise: true },
    });

    const duesAgg = await prisma.financialTransaction.aggregate({
      where: { ...where, category: 'MEMBERSHIP_DUES' },
      _sum: { amountInPaise: true },
    });

    const ticketAgg = await prisma.financialTransaction.aggregate({
      where: { ...where, category: 'TICKET_INCOME' },
      _sum: { amountInPaise: true },
    });

    const merchAgg = await prisma.financialTransaction.aggregate({
      where: { ...where, category: 'MERCHANDISE_SALES' },
      _sum: { amountInPaise: true },
    });

    const fundAgg = await prisma.financialTransaction.aggregate({
      where: { ...where, category: 'FUNDRAISER_INCOME' },
      _sum: { amountInPaise: true },
    });

    const reimPaidAgg = await prisma.financialTransaction.aggregate({
      where: { ...where, category: 'REIMBURSEMENT' },
      _sum: { amountInPaise: true },
    });

    const refundAgg = await prisma.financialTransaction.aggregate({
      where: { ...where, category: 'REFUND' },
      _sum: { amountInPaise: true },
    });

    // Pending reimbursements from Expense table (strictly awaiting review)
    const expenseWhere = { status: 'SUBMITTED' };
    if (clubId) expenseWhere.clubId = clubId;
    const pendingExp = await prisma.expense.aggregate({
      where: expenseWhere,
      _sum: { amountInPaise: true },
      _count: { id: true },
    });

    // Approved reimbursements from Expense table (approved, awaiting payment)
    const approvedWhere = { status: 'APPROVED' };
    if (clubId) approvedWhere.clubId = clubId;
    const approvedExp = await prisma.expense.aggregate({
      where: approvedWhere,
      _sum: { amountInPaise: true },
      _count: { id: true },
    });

    const totalIncome = income._sum.amountInPaise || 0;
    const totalOutflow = outflow._sum.amountInPaise || 0;
    const openingBalance = 48000000; // ₹4,80,000 initial bank balance in paise
    const closingBalance = openingBalance + totalIncome - totalOutflow;

    return {
      openingBalance,
      totalIncome,
      totalOutflow,
      closingBalance,
      pendingReimbursements: pendingExp._sum.amountInPaise || 0,
      pendingCount: pendingExp._count.id || 0,
      approvedReimbursements: approvedExp._sum.amountInPaise || 0,
      approvedCount: approvedExp._count.id || 0,
      dues: duesAgg._sum.amountInPaise || 0,
      ticketRevenue: ticketAgg._sum.amountInPaise || 0,
      merchRevenue: merchAgg._sum.amountInPaise || 0,
      fundraiserIncome: fundAgg._sum.amountInPaise || 0,
      reimbursementsPaid: reimPaidAgg._sum.amountInPaise || 0,
      refunds: refundAgg._sum.amountInPaise || 0,
    };
  }

  /**
   * Fetch recent ledger entries with flexible filters (club, category, date range, direction).
   */
  async getRecentTransactions(clubId = null, limit = 100, filters = {}) {
    const where = {};
    if (clubId) where.clubId = clubId;
    if (filters.clubId && filters.clubId !== 'ALL') where.clubId = filters.clubId;

    if (filters.category && filters.category !== 'ALL') {
      where.category = filters.category;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const e = new Date(filters.endDate);
        e.setHours(23, 59, 59, 999);
        where.date.lte = e;
      }
    }

    const incomeCategories = [
      'MEMBERSHIP_DUES',
      'TICKET_INCOME',
      'MERCHANDISE_SALES',
      'FUNDRAISER_INCOME',
      'DONATION',
    ];
    const outflowCategories = ['EXPENSE', 'REIMBURSEMENT', 'REFUND', 'PAYMENT_FEE'];

    if (filters.direction === 'in') {
      where.category = { in: incomeCategories };
    } else if (filters.direction === 'out') {
      where.category = { in: outflowCategories };
    }

    const transactions = await prisma.financialTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
    });

    const clubs = await prisma.club.findMany({ select: { id: true, name: true, slug: true } });
    const clubMap = new Map(clubs.map((c) => [c.id, c]));

    return transactions.map((t) => ({
      ...t,
      club: t.clubId ? clubMap.get(t.clubId) || null : null,
      clubName: t.clubId ? clubMap.get(t.clubId)?.name || 'General Association' : 'General Association',
    }));
  }
}

export const ledgerService = new LedgerService();

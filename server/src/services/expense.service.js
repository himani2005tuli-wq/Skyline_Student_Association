import prisma from '../config/database.js';
import { NotFoundError, BadRequestError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

class ExpenseService {
  /**
   * Submit a new expense for reimbursement.
   */
  async submitExpense(userId, data) {
    const expense = await prisma.expense.create({
      data: {
        userId,
        clubId: data.clubId, // Optional
        fundraiserId: data.fundraiserId, // Optional
        description: data.description,
        amountInPaise: data.amountInPaise,
        receiptUrl: data.receiptUrl,
        status: 'SUBMITTED',
      },
    });

    logger.info({ expenseId: expense.id, userId }, 'Expense submitted');
    return expense;
  }

  /**
   * Admin approves/rejects expense.
   */
  async reviewExpense(expenseId, reviewerId, status, note = '') {
    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({ where: { id: expenseId } });

      if (!expense) throw new NotFoundError('Expense not found');
      if (['APPROVED', 'REJECTED', 'PAID'].includes(expense.status)) {
        throw new BadRequestError(`Cannot review an expense that is already ${expense.status}`);
      }

      if (!['APPROVED', 'REJECTED'].includes(status)) {
        throw new BadRequestError('Invalid review status. Must be APPROVED or REJECTED.');
      }

      const updated = await tx.expense.update({
        where: { id: expenseId },
        data: {
          status,
          rejectionReason: status === 'REJECTED' ? note : null,
        },
      });

      // Automatically create a Reimbursement record if approved (pending actual payout)
      if (status === 'APPROVED') {
        await tx.reimbursement.create({
          data: {
            expenseId: updated.id,
            approvedBy: reviewerId,
            amountInPaise: updated.amountInPaise,
            note,
          },
        });
      }

      // Notify the volunteer/submitter of approval or rejection
      await tx.notification
        .create({
          data: {
            userId: updated.userId,
            title: status === 'APPROVED' ? 'Reimbursement Claim Approved' : 'Reimbursement Claim Rejected',
            message:
              status === 'APPROVED'
                ? `Your claim for "${updated.description}" (₹${updated.amountInPaise / 100}) has been approved.`
                : `Your claim for "${updated.description}" was rejected. Reason: ${note || 'No reason provided'}`,
            type: 'FINANCE',
            link: '/volunteer',
          },
        })
        .catch(() => {});

      logger.info({ expenseId, reviewerId, status }, 'Expense reviewed');
      return updated;
    });
  }

  /**
   * Treasurer marks the reimbursement as PAID.
   */
  async markAsPaid(expenseId, reviewerId) {
    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({
        where: { id: expenseId },
        include: { reimbursement: true },
      });

      if (!expense) throw new NotFoundError('Expense not found');
      if (expense.status !== 'APPROVED' || !expense.reimbursement) {
        throw new BadRequestError('Expense must be APPROVED before it can be marked as PAID');
      }

      const updatedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: { status: 'PAID' },
      });

      const reimbursement = await tx.reimbursement.update({
        where: { id: expense.reimbursement.id },
        data: { paidAt: new Date() },
      });

      // Record cash outflow in the financial ledger
      await tx.financialTransaction.create({
        data: {
          category: 'REIMBURSEMENT',
          amountInPaise: expense.amountInPaise,
          description: `Reimbursement: ${expense.description}`,
          referenceType: 'EXPENSE',
          referenceId: expense.id,
          clubId: expense.clubId,
        },
      });

      // Notify the member/volunteer that reimbursement has been disbursed
      await tx.notification
        .create({
          data: {
            userId: expense.userId,
            title: 'Reimbursement Disbursed',
            message: `Your reimbursement of ₹${expense.amountInPaise / 100} for "${expense.description}" has been marked paid.`,
            type: 'FINANCE',
            link: '/volunteer',
          },
        })
        .catch(() => {});

      logger.info({ expenseId, reviewerId }, 'Expense marked as PAID and recorded in ledger');
      return { expense: updatedExpense, reimbursement };
    });
  }

  /**
   * List user's personal expenses.
   */
  async getMyExpenses(userId) {
    return prisma.expense.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { reimbursement: true },
    });
  }

  /**
   * List club / treasury expenses with user details for Treasurer queue.
   */
  async listClubExpenses(filter = {}) {
    const where = {};
    if (filter.clubId) {
      where.clubId = filter.clubId;
    }
    if (filter.status) {
      where.status = filter.status;
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        reimbursement: true,
      },
    });

    const clubs = await prisma.club.findMany({ select: { id: true, name: true, slug: true } });
    const clubMap = new Map(clubs.map((c) => [c.id, c]));

    return expenses.map((e) => ({
      ...e,
      club: e.clubId ? clubMap.get(e.clubId) || null : null,
      clubName: e.clubId ? clubMap.get(e.clubId)?.name || 'General Association' : 'General Association',
    }));
  }
}

export const expenseService = new ExpenseService();

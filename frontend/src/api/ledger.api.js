import { http } from './client';

export const ledgerApi = {
  async getClubLedger(params = {}) {
    const query = new URLSearchParams();
    if (params.clubId && params.clubId !== 'ALL') query.append('clubId', params.clubId);
    if (params.category && params.category !== 'ALL') query.append('category', params.category);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.direction && params.direction !== 'ALL') query.append('direction', params.direction);

    const res = await http.get(`/ledger?${query.toString()}`);
    const { summary, transactions } = res.data?.data || {};
    const outflowCategories = ['EXPENSE', 'REIMBURSEMENT', 'REFUND', 'PAYMENT_FEE'];

    const formattedTxns = (transactions || []).map((t) => {
      const isOutflow = outflowCategories.includes(t.category);
      const categoryLabel = t.category
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      return {
        id: t.id,
        date: t.date || t.createdAt,
        dir: isOutflow ? 'out' : 'in',
        category: categoryLabel,
        rawCategory: t.category,
        description: t.description || 'Club Transaction',
        amount: Math.round(Math.abs(t.amountInPaise || 0) / 100),
        clubName: t.clubName || 'General Association',
        clubId: t.clubId || null,
        method: 'UPI / NetBanking',
      };
    });

    const opening = Math.round((summary?.openingBalance || 48000000) / 100);
    const totalIn = Math.round((summary?.totalIncome || 0) / 100);
    const totalOut = Math.round((summary?.totalOutflow || 0) / 100);
    // Closing cash balance is strictly opening + receipts - payments (pending claims are NOT deducted from cash)
    const closing = summary?.closingBalance != null
      ? Math.round(summary.closingBalance / 100)
      : opening + totalIn - totalOut;

    return {
      summary: {
        totalIn,
        totalOut,
        openingBalance: opening,
        closingBalance: closing,
        pendingReimbursements: Math.round((summary?.pendingReimbursements || 0) / 100),
        pendingCount: summary?.pendingCount || 0,
        approvedReimbursements: Math.round((summary?.approvedReimbursements || 0) / 100),
        approvedCount: summary?.approvedCount || 0,
        dues: Math.round((summary?.dues || 0) / 100),
        ticketRevenue: Math.round((summary?.ticketRevenue || 0) / 100),
        merchRevenue: Math.round((summary?.merchRevenue || 0) / 100),
        fundraiserIncome: Math.round((summary?.fundraiserIncome || 0) / 100),
        reimbursementsPaid: Math.round((summary?.reimbursementsPaid || 0) / 100),
        refunds: Math.round((summary?.refunds || 0) / 100),
      },
      transactions: formattedTxns,
    };
  },
};

export default ledgerApi;

import { http } from './client';

export const expensesApi = {
  async getMyExpenses() {
    const res = await http.get('/expenses/me');
    const expenses = res.data?.data?.expenses || [];
    return expenses.map((e) => ({
      id: e.id,
      volunteer: `${e.user?.firstName || 'Member'} ${e.user?.lastName || ''}`.trim(),
      email: e.user?.email || '',
      task: e.description,
      amount: Math.round((e.amountInPaise || 0) / 100),
      submitted: e.createdAt,
      status: e.status?.toLowerCase() || 'submitted',
      rawStatus: e.status,
      receipt: e.receiptUrl || 'receipt.pdf',
      receiptUrl: e.receiptUrl || '',
      rejectionReason: e.rejectionReason || null,
      clubName: e.clubName || 'General Association',
      reimbursement: e.reimbursement || null,
    }));
  },

  async getClubExpenses(params = {}) {
    const query = new URLSearchParams();
    if (params.clubId) query.append('clubId', params.clubId);
    if (params.status) query.append('status', params.status);

    const res = await http.get(`/expenses?${query.toString()}`);
    const expenses = res.data?.data?.expenses || [];
    return expenses.map((e) => ({
      id: e.id,
      volunteer: `${e.user?.firstName || 'Volunteer'} ${e.user?.lastName || ''}`.trim(),
      email: e.user?.email || '',
      task: e.description,
      amount: Math.round((e.amountInPaise || 0) / 100),
      submitted: e.createdAt,
      status: e.status?.toLowerCase() || 'submitted',
      rawStatus: e.status,
      receipt: e.receiptUrl || 'receipt.pdf',
      receiptUrl: e.receiptUrl || '',
      rejectionReason: e.rejectionReason || null,
      clubName: e.clubName || 'General Association',
      reimbursement: e.reimbursement || null,
    }));
  },

  async submit({ amountInPaise, description, receiptUrl, fundraiserId }) {
    const res = await http.post('/expenses', {
      amountInPaise,
      description,
      receiptUrl,
      fundraiserId,
    });
    return res.data?.data?.expense;
  },

  async review(id, { status, note, notes }) {
    const res = await http.post(`/expenses/${id}/review`, {
      status,
      note: note || notes || '',
    });
    return res.data?.data?.expense;
  },

  async markPaid(id) {
    const res = await http.post(`/expenses/${id}/pay`);
    return res.data?.data?.expense;
  },
};

export default expensesApi;

import ledgerApi from './ledger.api';
import expensesApi from './expenses.api';

export const financeApi = {
  async summary(params = {}) {
    const data = await ledgerApi.getClubLedger(params);
    return data.summary;
  },

  async ledger(params = {}) {
    const data = await ledgerApi.getClubLedger(params);
    return data.transactions;
  },

  async reimbursements(params = {}) {
    return expensesApi.getClubExpenses(params);
  },

  async approveReimbursement(id, note = '') {
    return expensesApi.review(id, { status: 'APPROVED', note });
  },

  async rejectReimbursement(id, note = '') {
    return expensesApi.review(id, { status: 'REJECTED', note });
  },

  async disburseReimbursement(id) {
    return expensesApi.markPaid(id);
  },

  async decideReimbursement(id, decision, note = '') {
    if (decision === 'approved') {
      return this.approveReimbursement(id, note);
    }
    if (decision === 'paid') {
      return this.disburseReimbursement(id);
    }
    return this.rejectReimbursement(id, note);
  },
};

export default financeApi;

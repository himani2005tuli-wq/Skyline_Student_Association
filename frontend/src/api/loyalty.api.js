import { http } from './client';

export const loyaltyApi = {
  async getMyBalance() {
    const res = await http.get('/loyalty/me');
    const account = res.data?.data?.account;
    return {
      points: account?.balance || 0,
      lifetimeEarned: account?.lifetimeEarned || 0,
      lifetimeRedeemed: account?.lifetimeRedeemed || 0,
      history: account?.transactions || [],
    };
  },

  async summary() {
    const account = await loyaltyApi.getMyBalance();
    return {
      balance: account.points,
      earned: account.lifetimeEarned,
      redeemed: account.lifetimeRedeemed,
      expiring: {
        points: 0,
        by: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      nextReward: {
        label: 'Free Merch & Discount Vouchers',
        at: 500,
      },
      txns: (account.history || []).map((t) => ({
        id: t.id,
        label: t.description || t.type,
        date: t.createdAt,
        type: t.type === 'REDEEM' ? 'redeem' : 'earn',
        points: t.type === 'REDEEM' ? -t.points : t.points,
      })),
      rules: [
        { id: 'r1', name: 'Purchase Cashback', value: '10 pts per ₹100', note: 'Every ₹100 spent on tickets or merch' },
        { id: 'r2', name: 'Event Check-in', value: '50 points', note: 'Event QR check-in verified at venue' },
        { id: 'r3', name: 'Volunteer Shifts', value: '100 points', note: 'Volunteer task completed and signed off' },
        { id: 'r4', name: 'Membership Renewal', value: '200 points', note: 'Annual membership renewal bonus' },
      ],
    };
  },

  async simulateEarn({ userId, points, description }) {
    const res = await http.post('/loyalty/simulate-earn', { userId, points, description });
    return res.data?.data?.transaction;
  },
};

export default loyaltyApi;

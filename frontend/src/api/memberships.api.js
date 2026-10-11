import { http } from './client';

export const membershipsApi = {
  async getPlans(clubSlug) {
    const res = await http.get('/memberships/plans', {
      params: clubSlug ? { clubSlug } : undefined,
    });
    const plans = res.data?.data?.plans || [];
    return plans.map((p) => {
      const b = p.benefits && typeof p.benefits === 'object' && !Array.isArray(p.benefits) ? p.benefits : {};
      const benefitsList = Array.isArray(p.benefits)
        ? p.benefits
        : [
            `${b.ticketDiscount || 15}% off all event tickets`,
            `${b.merchDiscount || 10}% off merchandise`,
            b.earlyAccess ? 'Priority ticket window & early access' : 'Members-only events & mixers',
            'Voting rights in club elections',
          ];

      return {
        id: p.id,
        clubId: p.clubId,
        club: p.club,
        clubName: p.club?.name || 'Skyline Student Association',
        clubSlug: p.club?.slug,
        name: p.name,
        description: p.description,
        price: (p.priceInPaise || 0) / 100,
        priceInPaise: p.priceInPaise || 0,
        duration: p.durationDays ? `${Math.round(p.durationDays / 30)} months` : '12 months',
        durationDays: p.durationDays || 365,
        ticketPct: typeof b.ticketDiscount === 'number' ? b.ticketDiscount : 15,
        merchPct: typeof b.merchDiscount === 'number' ? b.merchDiscount : 10,
        popular: (p.name || '').toLowerCase().includes('premium') || (p.name || '').toLowerCase().includes('annual'),
        benefits: benefitsList,
      };
    });
  },

  async getMyStatus() {
    const res = await http.get('/memberships/me');
    return res.data?.data?.membership;
  },

  async getAllMyMemberships() {
    const res = await http.get('/memberships/me');
    return res.data?.data?.memberships || [];
  },

  async subscribe(planId) {
    const res = await http.post('/memberships/subscribe', { planId });
    return res.data?.data;
  },
};

export default membershipsApi;

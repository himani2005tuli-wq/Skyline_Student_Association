import authApi from './auth.api';
import membershipsApi from './memberships.api';
import loyaltyApi from './loyalty.api';
import ordersApi from './orders.api';
import ticketsApi from './tickets.api';

export const memberApi = {
  async profile() {
    const [user, membershipData, account] = await Promise.all([
      authApi.getMe().catch(() => null),
      membershipsApi.getMyStatus().catch(() => null),
      loyaltyApi.getMyBalance().catch(() => ({ points: 0 })),
    ]);

    const membership = membershipData?.membership !== undefined ? membershipData.membership : membershipData;
    const allMemberships = Array.isArray(membershipData?.memberships)
      ? membershipData.memberships
      : (membership && membership.status === 'ACTIVE' ? [membership] : []);
    const hasActiveMembership = Boolean(membership && membership.status === 'ACTIVE');

    return {
      name: user?.name || user?.email || 'Member',
      email: user?.email || '',
      role: user?.role || 'member',
      hasActiveMembership,
      plan: hasActiveMembership ? (membership?.plan?.name || 'Active Member') : null,
      joined: hasActiveMembership ? (membership?.startDate || user?.createdAt) : null,
      expires: hasActiveMembership ? membership?.expiryDate : null,
      points: account?.points || 0,
      planDetails: hasActiveMembership ? membership?.plan : null,
      activeClub: membership?.plan?.club || null,
      allMemberships,
      payments: allMemberships.length > 0
        ? allMemberships.map((m) => ({
            id: `pay-${m.id}`,
            label: `${m.plan?.name || 'Membership'} (${m.plan?.club?.name || 'Club'}) dues`,
            date: m.startDate || user?.createdAt || new Date().toISOString(),
            amount: (m.plan?.priceInPaise || 0) / 100,
            status: 'paid',
          }))
        : [],
    };
  },

  async orders() {
    const orders = await ordersApi.getMyOrders();
    return (orders || []).map((o) => {
      const itemSummary =
        (o.items || [])
          .map((i) => `${i.variant?.product?.name || 'Merch'} × ${i.quantity}`)
          .join(', ') || 'Club Merchandise';
      return {
        id: o.id,
        date: o.createdAt,
        items: itemSummary,
        total: Math.round((o.finalPriceInPaise || 0) / 100),
        status: (o.status || 'PAID').toLowerCase(),
      };
    });
  },

  async tickets() {
    const tickets = await ticketsApi.getMyTickets();
    return (tickets || []).map((t) => ({
      ref: t.code || t.id,
      eventId: t.booking?.eventId,
      eventTitle: t.booking?.event?.title || 'Campus Event',
      type: t.booking?.ticketType?.name || 'General Admission',
      price: Math.round((t.booking?.ticketType?.priceInPaise || 0) / 100),
      status: t.status === 'VALID' ? 'confirmed' : t.status?.toLowerCase() || 'confirmed',
      checkedIn: t.status === 'USED',
    }));
  },
};

export default memberApi;

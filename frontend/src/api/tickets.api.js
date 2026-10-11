import { http } from './client';

export const ticketsApi = {
  async getMyTickets() {
    const res = await http.get('/tickets/me');
    const tickets = res.data?.data?.tickets || [];
    return tickets.map((t) => ({
      id: t.id,
      ref: t.code || t.id,
      eventId: t.booking?.eventId,
      eventTitle: t.booking?.event?.title || 'Campus Event',
      type: t.booking?.ticketType?.name || 'General Admission',
      price: Math.round((t.booking?.ticketType?.priceInPaise || 0) / 100),
      status: t.status === 'VALID' ? 'confirmed' : (t.status || 'confirmed').toLowerCase(),
      checkedIn: t.status === 'USED',
      qrData: t.code || t.id,
    }));
  },

  async book({ eventId, ticketTypeId, quantity = 1, pointsToRedeem = 0 }) {
    const res = await http.post('/tickets/book', {
      eventId,
      ticketTypeId,
      quantity,
      pointsToRedeem,
    });
    return res.data?.data;
  },

  async simulateWebhook({ bookingId, status = 'SUCCESS' }) {
    const res = await http.post('/tickets/simulate-webhook', { bookingId, status });
    return res.data?.data;
  },
};

export default ticketsApi;

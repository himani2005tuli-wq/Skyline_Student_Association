import { http } from './client';

export const eventsApi = {
  async list() {
    const res = await http.get('/events');
    const events = res.data?.data?.events || [];
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category || 'Campus',
      date: e.startDate || e.startTime,
      time: new Date(e.startDate || e.startTime || Date.now()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      venue: e.location,
      poster: e.posterUrl || 'https://images.unsplash.com/photo-1788629892553-cf85280ca421?q=80&w=1600&auto=format&fit=crop',
      capacity: e.capacity,
      sold: e.bookings?.length || 0,
      organizer: 'Skyline SA Events Team',
      desc: e.description,
      ticketTypes: (e.ticketTypes || []).map((tt) => ({
        id: tt.id,
        label: tt.name,
        price: (tt.priceInPaise || 0) / 100,
        memberPrice: (tt.memberPriceInPaise || 0) / 100,
        memberOnly: tt.priceInPaise === 0,
      })),
    }));
  },

  async detail(id) {
    const res = await http.get(`/events/${id}`);
    const e = res.data?.data?.event;
    if (!e) return null;
    return {
      id: e.id,
      title: e.title,
      category: e.category || 'Campus',
      date: e.startDate || e.startTime,
      time: new Date(e.startDate || e.startTime || Date.now()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      venue: e.location,
      poster: e.posterUrl || 'https://images.unsplash.com/photo-1788629892553-cf85280ca421?q=80&w=1600&auto=format&fit=crop',
      capacity: e.capacity,
      sold: e.bookings?.length || 0,
      organizer: 'Skyline SA Events Team',
      desc: e.description,
      ticketTypes: (e.ticketTypes || []).map((tt) => ({
        id: tt.id,
        label: tt.name,
        price: (tt.priceInPaise || 0) / 100,
        memberPrice: (tt.memberPriceInPaise || 0) / 100,
        memberOnly: tt.priceInPaise === 0,
      })),
    };
  },

  async create(payload) {
    const res = await http.post('/events', payload);
    return res.data?.data?.event;
  },

  async delete(id) {
    const res = await http.delete(`/events/${id}`);
    return res.data?.data;
  },
};

export default eventsApi;

import { http } from './client';

export const checkinApi = {
  async scan(qrPayload) {
    try {
      const code = String(qrPayload || '').trim();
      const res = await http.post('/check-ins/scan', { code, qrPayload: code });
      const data = res.data?.data;
      return {
        result: 'valid',
        name: `${data?.ticket?.booking?.user?.firstName || ''} ${data?.ticket?.booking?.user?.lastName || ''}`.trim() || data?.ticket?.booking?.user?.email || 'Verified Guest',
        event: data?.ticket?.booking?.event?.title || 'Campus Event',
        type: data?.ticket?.booking?.ticketType?.name || 'General Admission',
        checkedInAt: new Date().toLocaleTimeString('en-IN'),
      };
    } catch (err) {
      const msg = err.friendly || err.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('used')) {
        return { result: 'already', message: 'Ticket already scanned' };
      }
      if (msg.toLowerCase().includes('cancel')) {
        return { result: 'cancelled', message: 'Ticket cancelled' };
      }
      return { result: 'invalid', message: msg || 'Ticket validation failed' };
    }
  },

  async scanTicket(qrPayload) {
    return this.scan(qrPayload);
  },

  async attendees(params = {}) {
    const query = new URLSearchParams();
    if (params.eventId && params.eventId !== 'ALL') {
      query.append('eventId', params.eventId);
    }
    const res = await http.get(`/check-ins/attendees?${query.toString()}`);
    return res.data?.data?.attendees || [];
  },
};

export default checkinApi;

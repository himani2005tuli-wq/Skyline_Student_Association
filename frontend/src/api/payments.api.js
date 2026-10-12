import { http } from './client';

export const paymentsApi = {
  async getConfig() {
    const res = await http.get('/payments/config');
    return res.data?.data;
  },

  async createOrder(payload) {
    const res = await http.post('/payments/create-order', payload);
    return res.data?.data;
  },

  async verifyPayment(payload) {
    const res = await http.post('/payments/verify', payload);
    return res.data?.data;
  },

  async mockConfirm({ orderId, bookingId, membershipId, paymentId = 'pay_simulated_success' }) {
    const res = await http.post('/payments/mock-confirm', { orderId, bookingId, membershipId, paymentId });
    return res.data?.data;
  },

  async verifyOtp({ refId, kind, otp = '123456' }) {
    const res = await http.post('/payments/verify-otp', { refId, kind, otp });
    return res.data?.data;
  },
};

export default paymentsApi;

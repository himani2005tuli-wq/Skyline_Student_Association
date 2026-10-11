import { http } from './client';

export const ordersApi = {
  async getMyOrders() {
    const res = await http.get('/orders/me');
    const orders = res.data?.data?.orders || [];
    return orders.map((o) => {
      const itemSummary =
        (o.items || [])
          .map((i) => `${i.variant?.product?.name || 'Merchandise'} × ${i.quantity}`)
          .join(', ') || 'Club Merchandise';
      return {
        id: o.id,
        date: o.createdAt,
        items: itemSummary,
        total: Math.round((o.totalInPaise || o.finalPriceInPaise || 0) / 100),
        status: (o.status || 'PAID').toLowerCase(),
        rawOrder: o,
      };
    });
  },

  async checkout({ items, pointsToRedeem = 0 }) {
    const res = await http.post('/orders/checkout', {
      items,
      pointsToRedeem,
    });
    return res.data?.data;
  },

  async cancel(orderId) {
    const res = await http.post('/orders/cancel', { orderId });
    return res.data?.data?.order;
  },

  async simulateWebhook({ orderId, status = 'SUCCESS' }) {
    const res = await http.post('/orders/simulate-webhook', { orderId, status });
    return res.data?.data;
  },
};

export default ordersApi;

import { http } from './client';

export const communicationApi = {
  async getAnnouncements() {
    const res = await http.get('/communication/announcements');
    const announcements = res.data?.data?.announcements || [];
    return announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.content || a.body,
      date: a.publishedAt || a.createdAt,
      category: a.audience?.category || 'General',
      pinned: a.audience?.pinned ?? false,
      scheduledFor: a.scheduledFor,
    }));
  },

  async createAnnouncement(payload) {
    const res = await http.post('/communication/announcements', payload);
    return res.data?.data?.announcement;
  },

  async getScheduledAnnouncements() {
    const res = await http.get('/communication/scheduled');
    return res.data?.data || { scheduled: [], cronStatus: null };
  },

  async cancelScheduledAnnouncement(id) {
    const res = await http.delete(`/communication/scheduled/${id}`);
    return res.data?.data;
  },

  async updateAnnouncement(id, payload) {
    const res = await http.put(`/communication/announcements/${id}`, payload);
    return res.data?.data?.announcement;
  },

  async deleteAnnouncement(id) {
    const res = await http.delete(`/communication/announcements/${id}`);
    return res.data?.data;
  },

  async triggerScheduledCron() {
    const res = await http.post('/communication/scheduled/trigger');
    return res.data?.data;
  },

  async getCronStatus() {
    const res = await http.get('/communication/cron/status');
    return res.data?.data;
  },

  async pushNotification(payload) {
    const res = await http.post('/communication/notifications/push', payload);
    return res.data?.data;
  },

  async getMyNotifications(limit = 20) {
    const res = await http.get(`/communication/notifications/me?limit=${limit}`);
    return res.data?.data || { notifications: [], unreadCount: 0 };
  },

  async markNotificationRead(id) {
    const res = await http.patch(`/communication/notifications/${id}/read`);
    return res.data?.data;
  },

  async markAllNotificationsRead() {
    const res = await http.patch('/communication/notifications/read-all');
    return res.data?.data;
  },

  async getMyPreferences() {
    const res = await http.get('/communication/preferences/me');
    return res.data?.data?.preferences;
  },

  async updateMyPreferences(payload) {
    const res = await http.post('/communication/preferences/me', payload);
    return res.data?.data?.preferences;
  },
};

export default communicationApi;

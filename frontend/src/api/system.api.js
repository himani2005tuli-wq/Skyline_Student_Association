import http from './client';

export const systemApi = {
  /**
   * Comprehensive platform telemetry and service metrics
   */
  async getOverview() {
    const res = await http.get('/system/overview');
    return res.data?.data || null;
  },

  /**
   * Real database users with dynamic role authorities
   */
  async users() {
    const res = await http.get('/users');
    return res.data?.data?.users || [];
  },

  /**
   * Dynamic RBAC Role Authority Matrix from PostgreSQL
   */
  async getRoleMatrix() {
    const res = await http.get('/users/roles/matrix');
    return res.data?.data || { matrix: {}, systemAuthorities: [] };
  },

  /**
   * Update dynamic role authorities in PostgreSQL
   */
  async updateRoleAuthorities(role, authorities) {
    const res = await http.put(`/users/roles/${role}/authorities`, { authorities });
    return res.data?.data;
  },

  /**
   * Update user role dynamically in database
   */
  async changeRole(userId, role) {
    const res = await http.patch(`/users/${userId}/role`, { role });
    return res.data?.data?.user;
  },

  /**
   * Grant granular authority to user
   */
  async grantAuthority(userId, authority) {
    const res = await http.post(`/users/${userId}/authorities`, { authority });
    return res.data?.data;
  },

  /**
   * Revoke granular authority from user
   */
  async revokeAuthority(userId, authority) {
    const res = await http.delete(`/users/${userId}/authorities/${encodeURIComponent(authority)}`);
    return res.data?.data;
  },

  /**
   * Real Audit Trail Logs from database
   */
  async auditLogs() {
    const res = await http.get('/system/audit-logs');
    return res.data?.data?.logs || [];
  },

  /**
   * Detailed system & infrastructure health
   */
  async health() {
    const res = await http.get('/health/detailed');
    return res.data?.data || {};
  },

  /**
   * Flush Redis/memory cache
   */
  async clearCache() {
    const res = await http.post('/system/cache/clear');
    return res.data;
  },

  /**
   * Trigger immediate background notification cron tick
   */
  async triggerCron() {
    const res = await http.post('/system/cron/trigger');
    return res.data;
  },

  /**
   * Manage Clubs
   */
  async getClubs() {
    const res = await http.get('/clubs');
    return res.data?.data?.clubs || [];
  },

  async createClub(payload) {
    const res = await http.post('/clubs', payload);
    return res.data?.data?.club;
  },

  async updateClub(id, payload) {
    const res = await http.put(`/clubs/${id}`, payload);
    return res.data?.data?.club;
  },

  async deleteClub(id) {
    const res = await http.delete(`/clubs/${id}`);
    return res.data;
  },
};

export default systemApi;

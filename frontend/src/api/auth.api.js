import { http, fetchCsrfToken, setStoredToken } from './client';

export function normalizeRole(role) {
  if (!role) return 'member';
  const r = role.toUpperCase();
  if (r === 'SUPER_ADMIN') return 'super_admin';
  if (r === 'CLUB_ADMIN') return 'admin';
  if (r === 'TREASURER') return 'treasurer';
  if (r === 'EVENT_MANAGER') return 'event_manager';
  if (r === 'VOLUNTEER') return 'volunteer';
  return 'member';
}

async function enrichUser(rawUser) {
  if (!rawUser) return null;

  let planName = null;
  let pointsBalance = 0;

  try {
    const [memRes, loyRes] = await Promise.allSettled([
      http.get('/memberships/me'),
      http.get('/loyalty/me'),
    ]);

    if (memRes.status === 'fulfilled' && memRes.value.data?.data?.membership) {
      planName = memRes.value.data.data.membership.plan?.name || 'Active Member';
    }
    if (loyRes.status === 'fulfilled' && loyRes.value.data?.data?.account) {
      pointsBalance =
        loyRes.value.data.data.account.balance ??
        loyRes.value.data.data.account.currentPoints ??
        0;
    }
  } catch {}

  return {
    id: rawUser.id,
    name: `${rawUser.firstName || ''} ${rawUser.lastName || ''}`.trim() || rawUser.email,
    email: rawUser.email,
    role: normalizeRole(rawUser.role),
    rawRole: rawUser.role,
    clubId: rawUser.clubId || rawUser.club?.id || null,
    club: rawUser.club || null,
    authorities: rawUser.authorities || [],
    plan: planName,
    points: pointsBalance,
  };
}

export const authApi = {
  async getCsrf() {
    return fetchCsrfToken();
  },

  async register(data) {
    let payload = { ...data };
    if (data.name && (!data.firstName || !data.lastName)) {
      const parts = data.name.trim().split(/\s+/);
      payload.firstName = parts[0] || 'Member';
      payload.lastName = parts.slice(1).join(' ') || parts[0] || 'User';
    }
    const res = await http.post('/auth/register', payload);
    if (res.data?.data?.token) {
      setStoredToken(res.data.data.token);
    }
    return enrichUser(res.data?.data?.user);
  },

  async login(email, password) {
    const res = await http.post('/auth/login', { email, password });
    if (res.data?.data?.token) {
      setStoredToken(res.data.data.token);
    }
    const rawUser = res.data?.data?.user;
    return enrichUser(rawUser);
  },

  async logout() {
    setStoredToken(null);
    try {
      const res = await http.post('/auth/logout');
      return res.data;
    } catch {
      return { status: 'success' };
    }
  },

  async getMe() {
    const res = await http.get('/auth/me');
    if (res.data?.data?.token) {
      setStoredToken(res.data.data.token);
    }
    const rawUser = res.data?.data?.user;
    return enrichUser(rawUser);
  },

  async me() {
    return this.getMe();
  },

  async forgotPassword(email) {
    const res = await http.post('/auth/forgot-password', { email });
    return res.data;
  },

  async resetPassword(token, password) {
    const res = await http.post('/auth/reset-password', { token, password });
    return res.data;
  },
};

export default authApi;

import axios from 'axios';

const rawBackend = import.meta.env.VITE_BACKEND_URL || '';
export const API_BASE = rawBackend.trim().replace(/\/+$/, '');

export const http = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  withCredentials: true, // Send httpOnly session cookies
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const TOKEN_KEY = 'altitude.jwt_token';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
}

let csrfTokenCache = null;
let csrfPromise = null;

export async function fetchCsrfToken() {
  if (csrfPromise) return csrfPromise;

  csrfPromise = http
    .get('/auth/csrf')
    .then((res) => {
      csrfTokenCache = res.data?.data?.csrfToken || null;
      return csrfTokenCache;
    })
    .catch((err) => {
      console.warn('[API] Unable to fetch CSRF token:', err.message);
      return null;
    })
    .finally(() => {
      csrfPromise = null;
    });

  return csrfPromise;
}

// Request Interceptor: Attach JWT Bearer token and CSRF token on mutating requests
http.interceptors.request.use(
  async (config) => {
    // Attach JWT Bearer token if available
    const token = getStoredToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const method = config.method?.toUpperCase();
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    const isPreAuth =
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/register') ||
      config.url?.includes('/auth/forgot-password') ||
      config.url?.includes('/auth/reset-password');

    if (isStateChanging && !config.url?.includes('/auth/csrf') && !isPreAuth) {
      if (!csrfTokenCache) {
        await fetchCsrfToken();
      }
      if (csrfTokenCache) {
        config.headers['X-CSRF-Token'] = csrfTokenCache;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export function formatApiErrorDetail(detail) {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === 'string' ? e.msg : typeof e === 'string' ? e : JSON.stringify(e)))
      .filter(Boolean)
      .join(' ');
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
}

// Response Interceptor: Auto-retry on CSRF token expiration & format friendly error
http.interceptors.response.use(
  (response) => response,
  async (err) => {
    const originalRequest = err.config;

    if (
      err.response?.status === 403 &&
      err.response?.data?.error?.message?.toLowerCase().includes('csrf') &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      csrfTokenCache = null;
      const newToken = await fetchCsrfToken();
      if (newToken) {
        originalRequest.headers['X-CSRF-Token'] = newToken;
        return http(originalRequest);
      }
    }

    const msg =
      err.response?.data?.error?.message ||
      err.response?.data?.message ||
      formatApiErrorDetail(err.response?.data?.detail) ||
      err.message;

    err.friendly = msg;
    return Promise.reject(err);
  },
);

export default http;

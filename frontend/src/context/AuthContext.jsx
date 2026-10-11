import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { authApi } from '@/api';
import { updateSocketAuth } from '@/utils/socket';

/* Real session context with automatic HttpOnly cookie restoration. */
const KEY = 'altitude.session';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Check backend session on initial load
  useEffect(() => {
    let isMounted = true;
    authApi
      .me()
      .then((freshUser) => {
        if (isMounted && freshUser) {
          setUser(freshUser);
          try {
            sessionStorage.setItem(KEY, JSON.stringify(freshUser));
          } catch {}
          updateSocketAuth();
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          try {
            sessionStorage.removeItem(KEY);
          } catch {}
          updateSocketAuth();
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await authApi.login(email, password);
    setUser(u);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(u));
    } catch {}
    updateSocketAuth();
    return u;
  }, []);

  const sessionLogin = useCallback((u) => {
    setUser(u);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(u));
    } catch {}
    updateSocketAuth();
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
    updateSocketAuth();
  }, []);

  const refreshPoints = useCallback((points) => {
    setUser((u) => {
      if (!u) return u;
      const next = { ...u, points };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ user, login, sessionLogin, logout, refreshPoints }),
    [user, login, sessionLogin, logout, refreshPoints],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

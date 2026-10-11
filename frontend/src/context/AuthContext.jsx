import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { authApi } from '@/api';
import { updateSocketAuth } from '@/utils/socket';
import { getStoredToken, setStoredToken } from '@/api/client';

/* Real session context with automatic token and profile restoration across refresh. */
const KEY = 'altitude.session';
const AuthContext = createContext(null);

function getPersistedUser() {
  try {
    const raw = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistUser(u) {
  try {
    if (u) {
      const serialized = JSON.stringify(u);
      localStorage.setItem(KEY, serialized);
      sessionStorage.setItem(KEY, serialized);
    } else {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
    }
  } catch {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getPersistedUser());

  // Check backend session on initial load / refresh
  useEffect(() => {
    let isMounted = true;
    const token = getStoredToken();
    const persisted = getPersistedUser();

    // If neither token nor cached session exists, ensure logged out
    if (!token && !persisted) {
      setUser(null);
      return;
    }

    authApi
      .me()
      .then((freshUser) => {
        if (isMounted && freshUser) {
          setUser(freshUser);
          persistUser(freshUser);
          updateSocketAuth();
        }
      })
      .catch((err) => {
        // Only invalidate if backend explicitly returned 401 Unauthorized
        if (isMounted && err?.response?.status === 401) {
          setUser(null);
          persistUser(null);
          setStoredToken(null);
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
    persistUser(u);
    updateSocketAuth();
    return u;
  }, []);

  const sessionLogin = useCallback((u) => {
    setUser(u);
    persistUser(u);
    updateSocketAuth();
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {}
    setUser(null);
    persistUser(null);
    setStoredToken(null);
    updateSocketAuth();
  }, []);

  const refreshPoints = useCallback((points) => {
    setUser((u) => {
      if (!u) return u;
      const next = { ...u, points };
      persistUser(next);
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

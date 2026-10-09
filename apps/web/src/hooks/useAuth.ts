'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth, getToken, setToken, clearToken } from '@/lib/api';
import type { UserProfile } from '@/lib/types';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Attempt to restore session from localStorage on mount
  useEffect(() => {
    const handleUnauthorized = () => {
      clearToken();
      setUser(null);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pos:unauthorized', handleUnauthorized);
    }

    const token = getToken();
    if (!token) {
      setLoading(false);
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('pos:unauthorized', handleUnauthorized);
        }
      };
    }
    auth.me()
      .then(setUser)
      .catch(() => clearToken())   // stale token — clear it
      .finally(() => setLoading(false));

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pos:unauthorized', handleUnauthorized);
      }
    };
  }, []);

  const login = useCallback(async (email: string, password?: string) => {
    setError(null);
    try {
      const res = await auth.login(email, password);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw err;
    }
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password?: string, title?: string) => {
      setError(null);
      try {
        const res = await auth.signup(name, email, password, title);
        setToken(res.token);
        setUser(res.user);
        return res.user;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Signup failed';
        setError(msg);
        throw err;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try { await auth.logout(); } catch { /* ignore */ }
    clearToken();
    setUser(null);
  }, []);

  return { user, loading, error, login, signup, logout };
}

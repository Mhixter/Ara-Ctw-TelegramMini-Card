import { useState, useEffect } from 'react';
import { authApi } from '../lib/api';
import { useTelegram } from './useTelegram';

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.exp * 1000) < Date.now();
  } catch {
    return true;
  }
}

export interface User {
  id: string;
  telegramId?: number;
  username?: string;
  firstName?: string;
  kycStatus: 'PENDING' | 'PENDING_REVIEW' | 'TIER_1' | 'TIER_2' | 'BANNED';
  isActive: boolean;
}

export function useAuth() {
  const { telegramId, username, firstName, initData, isInTelegram } = useTelegram();

  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(() => {
    const hasSession = !!(localStorage.getItem('user') && localStorage.getItem('token'));
    return !hasSession;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleSignout() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
      setError('Your session expired. Tap Retry to reconnect.');
    }
    window.addEventListener('auth:signout', handleSignout);
    return () => window.removeEventListener('auth:signout', handleSignout);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const hasSession = !!(token && savedUser);

    if (hasSession && token && isTokenExpired(token)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      authenticateTelegram();
    } else if (!hasSession) {
      authenticateTelegram();
    } else {
      setLoading(false);
    }
  }, []);

  async function authenticateTelegram() {
    if (!isInTelegram && !telegramId && !(initData && initData.length > 20)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let body: Record<string, any>;
      if (initData && initData.length > 20) {
        body = { initData, telegramId, username, firstName };
      } else if (telegramId) {
        body = { telegramId, username, firstName };
      } else {
        setLoading(false);
        return;
      }

      const data = await authApi.telegram(body);

      if (localStorage.getItem('token')) return;

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (e: any) {
      if (localStorage.getItem('token')) return;

      const status = e.response?.status;
      const serverMsg = e.response?.data?.error;

      if (!e.response) {
        setError('Cannot reach the server. Check your internet connection.');
      } else if (status === 500) {
        setError('Server error. Please try again in a moment.');
      } else {
        setError(serverMsg || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
    authenticateTelegram();
  }

  function refreshUser(updated: Partial<User>) {
    if (!user) return;
    const next = { ...user, ...updated };
    localStorage.setItem('user', JSON.stringify(next));
    setUser(next);
  }

  return {
    user,
    loading,
    error,
    isInTelegram,
    authenticate: authenticateTelegram,
    logout,
    refreshUser,
  };
}

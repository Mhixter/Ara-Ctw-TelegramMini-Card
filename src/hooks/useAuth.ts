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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);

  useEffect(() => {
    function handleSignout() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
      setNeedsConnect(true);
      setError('Your session expired. Tap Connect to sign in again.');
    }
    window.addEventListener('auth:signout', handleSignout);
    return () => window.removeEventListener('auth:signout', handleSignout);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const hasValidSession = !!(token && savedUser && !isTokenExpired(token));

    if (hasValidSession) {
      setLoading(false);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setNeedsConnect(true);
    }
  }, []);

  async function authenticateTelegram() {
    if (!isInTelegram && !telegramId && !(initData && initData.length > 20)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNeedsConnect(false);

    try {
      let body: Record<string, any>;
      if (initData && initData.length > 20) {
        body = { initData, telegramId, username, firstName };
      } else if (telegramId) {
        body = { telegramId, username, firstName };
      } else {
        setLoading(false);
        setNeedsConnect(true);
        return;
      }

      const data = await authApi.telegram(body);

console.log('✅ Login response:', data);
localStorage.setItem('token', data.token);
console.log('✅ Token saved:', data.token);
localStorage.setItem('user', JSON.stringify(data.user));
console.log('✅ User saved:', data.user);
setUser(data.user);
setNeedsConnect(false);
    } catch (e: any) {
      const status = e.response?.status;
      const serverMsg = e.response?.data?.error;

      if (!e.response) {
        setError('Cannot reach the server. Check your connection.');
      } else if (status === 500) {
        setError('Server error. Please try again.');
      } else {
        setError(serverMsg || 'Authentication failed. Please try again.');
      }
      setNeedsConnect(true);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
    setNeedsConnect(true);
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
    needsConnect,
    isInTelegram,
    authenticate: authenticateTelegram,
    logout,
    refreshUser,
  };
}

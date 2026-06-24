import { useState, useEffect } from 'react';
import { authApi } from '../lib/api';
import { useTelegram } from './useTelegram';

export interface User {
  id: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  kycStatus: 'PENDING' | 'TIER_1' | 'TIER_2' | 'BANNED';
  isActive: boolean;
}

export function useAuth() {
  const { telegramId, username, firstName, initData, isInTelegram } = useTelegram();
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) authenticate();
  }, []);

  async function authenticate() {
    setLoading(true);
    setError(null);
    try {
      const payload = isInTelegram && initData
        ? { initData }
        : { telegramId: telegramId || Math.floor(Math.random() * 9000000000) + 1000000000, username, firstName };
      const data = await authApi.telegram(payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  function refreshUser(updated: Partial<User>) {
    if (!user) return;
    const next = { ...user, ...updated };
    localStorage.setItem('user', JSON.stringify(next));
    setUser(next);
  }

  return { user, loading, error, authenticate, logout, refreshUser };
}

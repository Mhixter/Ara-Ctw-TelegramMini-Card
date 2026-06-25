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

function getGuestId(): number {
  const key = 'nv_guest_id';
  const stored = localStorage.getItem(key);
  if (stored) return parseInt(stored, 10);
  const id = Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000;
  localStorage.setItem(key, String(id));
  return id;
}

export function useAuth() {
  const { telegramId, username, firstName, initData } = useTelegram();

  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(() => {
    const hasSession = !!(localStorage.getItem('user') && localStorage.getItem('token'));
    return !hasSession;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hasSession = !!(localStorage.getItem('user') && localStorage.getItem('token'));
    if (!hasSession) {
      authenticate();
    }
  }, []);

  async function authenticate() {
    setLoading(true);
    setError(null);
    try {
      // Use real Telegram initData only if it carries actual data (>20 chars)
      const hasTgData = !!(initData && initData.length > 20);
      const payload = hasTgData
        ? { initData }
        : {
            telegramId: telegramId || getGuestId(),
            username: username || undefined,
            firstName: firstName || 'Guest',
          };

      const data = await authApi.telegram(payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (e: any) {
      const status = e.response?.status;
      const serverMsg = e.response?.data?.error;

      let msg: string;
      if (!e.response) {
        msg = 'Cannot reach the server. Check your internet connection.';
      } else if (status === 405) {
        msg = 'Server configuration error (405). The API URL may not be set correctly in this deployment.';
      } else if (status === 401) {
        msg = serverMsg || 'Invalid or expired Telegram session. Please close and reopen the app.';
      } else if (status === 500) {
        msg = 'Server error. Please try again in a moment.';
      } else {
        msg = serverMsg || e.message || 'Authentication failed';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Keep nv_guest_id so the same guest re-authenticates to the same account
    setUser(null);
    authenticate();
  }

  function refreshUser(updated: Partial<User>) {
    if (!user) return;
    const next = { ...user, ...updated };
    localStorage.setItem('user', JSON.stringify(next));
    setUser(next);
  }

  return { user, loading, error, authenticate, logout, refreshUser };
}

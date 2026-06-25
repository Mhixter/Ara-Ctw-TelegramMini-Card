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
  const { telegramId, username, firstName, initData } = useTelegram();

  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(() => {
    const hasSession = !!(localStorage.getItem('user') && localStorage.getItem('token'));
    return !hasSession;
  });
  const [error, setError] = useState<string | null>(null);
  const [needsWidgetLogin, setNeedsWidgetLogin] = useState(false);

  useEffect(() => {
    const hasSession = !!(localStorage.getItem('user') && localStorage.getItem('token'));
    if (!hasSession) {
      authenticate();
    }
  }, []);

  async function authenticate(payload?: Record<string, any>) {
    setLoading(true);
    setError(null);
    setNeedsWidgetLogin(false);

    try {
      let body: Record<string, any>;

      if (payload) {
        // Called directly with widget data or override
        body = payload;
      } else if (initData && initData.length > 20) {
        // Inside Telegram Mini App — use cryptographic initData
        body = { initData };
      } else if (telegramId) {
        // Has some Telegram context (username/firstName from WebApp)
        body = { telegramId, username, firstName };
      } else {
        // No Telegram context at all — needs widget login
        setNeedsWidgetLogin(true);
        setLoading(false);
        return;
      }

      const data = await authApi.telegram(body);
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
        msg = 'Server configuration error (405). RAILWAY_URL may not be set in Cloudflare.';
      } else if (status === 401) {
        // initData rejected → fall back to widget login
        setNeedsWidgetLogin(true);
        setLoading(false);
        return;
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

  async function loginWithWidget(widgetUser: {
    id: number;
    first_name: string;
    username?: string;
    auth_date: number;
    hash: string;
    [key: string]: any;
  }) {
    await authenticate({ widgetData: widgetUser });
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setNeedsWidgetLogin(false);
    authenticate();
  }

  function refreshUser(updated: Partial<User>) {
    if (!user) return;
    const next = { ...user, ...updated };
    localStorage.setItem('user', JSON.stringify(next));
    setUser(next);
  }

  return { user, loading, error, needsWidgetLogin, authenticate, loginWithWidget, logout, refreshUser };
}

import { useState, useEffect } from 'react';
import { authApi } from '../lib/api';
import { useTelegram } from './useTelegram';

export interface User {
  id: string;
  telegramId?: number;
  username?: string;
  firstName?: string;
  email?: string;
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
  const [needsManualLogin, setNeedsManualLogin] = useState(false);

  useEffect(() => {
    function handleSignout() {
      setUser(null);
      setNeedsManualLogin(true);
      setLoading(false);
      setError(null);
    }
    window.addEventListener('auth:signout', handleSignout);
    return () => window.removeEventListener('auth:signout', handleSignout);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get('auth_token');
    const authUser  = urlParams.get('auth_user');
    const authError = urlParams.get('auth_error');

    if (authError) {
      window.history.replaceState({}, '', window.location.pathname);
      setError(decodeURIComponent(authError));
      setLoading(false);
      setNeedsManualLogin(true);
      return;
    }

    if (authToken && authUser) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(authUser));
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(parsedUser));
        setUser(parsedUser);
        setLoading(false);
        window.history.replaceState({}, '', window.location.pathname);
        return;
      } catch {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    const hasSession = !!(localStorage.getItem('user') && localStorage.getItem('token'));
    if (!hasSession) {
      authenticateTelegram();
    } else {
      setLoading(false);
    }
  }, []);

  async function authenticateTelegram(payload?: Record<string, any>) {
    setLoading(true);
    setError(null);
    setNeedsManualLogin(false);

    try {
      let body: Record<string, any>;

      if (payload) {
        body = payload;
      } else if (initData && initData.length > 20) {
        body = { initData, telegramId, username, firstName };
      } else if (telegramId) {
        body = { telegramId, username, firstName };
      } else {
        setNeedsManualLogin(true);
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

      if (status === 401) {
        setNeedsManualLogin(true);
        setLoading(false);
        return;
      }

      let msg: string;
      if (!e.response) {
        msg = 'Cannot reach the server. Check your internet connection.';
      } else if (status === 405) {
        msg = 'Server configuration error (405). The API URL may not be set correctly.';
      } else if (status === 500) {
        msg = 'Server error. Please try again in a moment.';
      } else {
        msg = serverMsg || e.message || 'Authentication failed';
      }
      setError(msg);
      setNeedsManualLogin(true);
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
    await authenticateTelegram({ widgetData: widgetUser });
  }

  async function loginWithEmail(email: string, password: string): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login({ email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setNeedsManualLogin(false);
    } catch (e: any) {
      const msg = e.response?.data?.error || 'Login failed. Please try again.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function registerWithEmail(email: string, password: string, firstName?: string): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.register({ email, password, firstName });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setNeedsManualLogin(false);
    } catch (e: any) {
      const msg = e.response?.data?.error || 'Registration failed. Please try again.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }

  function signInWithGitHub() {
    window.location.href = authApi.githubAuthUrl();
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setNeedsManualLogin(false);
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
    needsManualLogin,
    needsWidgetLogin: needsManualLogin,
    authenticate: authenticateTelegram,
    loginWithWidget,
    loginWithEmail,
    registerWithEmail,
    signInWithGitHub,
    logout,
    refreshUser,
  };
}

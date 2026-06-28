import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CardsPage from './pages/CardsPage';
import KYCPage from './pages/KYCPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AuthPage from './components/AuthPage';
import { useAuth } from './hooks/useAuth';
import { API_BASE } from './lib/api';
import { BoorderPayIcon } from './components/BoorderPayLogo';

type Tab = 'home' | 'cards' | 'kyc' | 'profile' | 'admin';

export default function App() {
  const { user, loading, error, isInTelegram, authenticate, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setIsAdminMode(true);
    }
  }, []);

  function handleAdminLogin(data: { token: string; role: string }) {
    localStorage.setItem('token', data.token);
    setAdminRole(data.role);
    setActiveTab('admin');
  }

  if (isAdminMode && !adminRole) {
    return <AdminLoginPage onLogin={handleAdminLogin} />;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div style={{ animation: 'pulse-glow 2s infinite' }}>
          <BoorderPayIcon size={56} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 700, fontSize: '18px' }}>BoorderPay</p>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginTop: '4px' }}>
            {isInTelegram ? 'Signing you in…' : 'Initializing…'}
          </p>
        </div>
        <div className="spinner" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid rgba(108,99,255,0.2)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <AuthPage
        isInTelegram={isInTelegram}
        error={error}
        onRetry={authenticate}
      />
    );
  }

  if (error && !user) {
    const isNoConnection = error.includes('reach the server');
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', gap: '12px' }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <h2 style={{ fontWeight: 700 }}>Connection Error</h2>
        <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px', maxWidth: '300px' }}>{error}</p>
        {isNoConnection && (
          <p style={{ color: '#f59e0b', fontSize: '12px', maxWidth: '300px', lineHeight: '1.5' }}>
            Trying to reach: <strong style={{ wordBreak: 'break-all' }}>{API_BASE}</strong>
          </p>
        )}
        <button className="btn-primary" onClick={authenticate} style={{ maxWidth: '200px', marginTop: '8px' }}>
          Retry
        </button>
      </div>
    );
  }

  const isAdmin = adminRole !== null;

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin}>
      <div className="fade-in-up" key={activeTab}>
        {activeTab === 'home'    && <HomePage user={user} />}
        {activeTab === 'cards'   && <CardsPage user={user} />}
        {activeTab === 'kyc'     && (
          <KYCPage
            user={user}
            onKycUpdated={(status) => refreshUser({ kycStatus: status as any })}
          />
        )}
        {activeTab === 'admin'   && isAdmin && <AdminPage adminRole={adminRole!} />}
        {activeTab === 'profile' && (
          <ProfilePage
            user={user}
            onLogout={() => { logout(); setIsAdminMode(false); setAdminRole(null); }}
          />
        )}
      </div>
    </Layout>
  );
}

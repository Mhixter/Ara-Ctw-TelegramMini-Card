import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CardsPage from './pages/CardsPage';
import KYCPage from './pages/KYCPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import AdminLoginPage from './pages/AdminLoginPage';
import TelegramLoginWidget from './components/TelegramLoginWidget';
import { useAuth } from './hooks/useAuth';

type Tab = 'home' | 'cards' | 'kyc' | 'profile' | 'admin';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || '';

export default function App() {
  const { user, loading, error, needsWidgetLogin, loginWithWidget, logout, refreshUser } = useAuth();
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
        <div style={{
          width: '56px', height: '56px', borderRadius: '18px',
          background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px var(--accent-glow)',
          animation: 'pulse-glow 2s infinite'
        }}>
          <span style={{ fontSize: '24px' }}>₦</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 700, fontSize: '18px' }}>NairaVault</p>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginTop: '4px' }}>Initializing secure session...</p>
        </div>
        <div className="spinner" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid rgba(108,99,255,0.2)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (needsWidgetLogin || (!user && !error)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', gap: '24px' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '22px',
          background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px var(--accent-glow)'
        }}>
          <span style={{ fontSize: '32px' }}>₦</span>
        </div>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '22px', marginBottom: '8px' }}>Welcome to NairaVault</h2>
          <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px', maxWidth: '260px', lineHeight: '1.6' }}>
            Sign in with your Telegram account to access your wallet.
          </p>
        </div>
        {BOT_USERNAME ? (
          <TelegramLoginWidget
            botId={BOT_USERNAME}
            onAuth={loginWithWidget}
          />
        ) : (
          <div style={{
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: '12px',
            padding: '16px',
            maxWidth: '280px',
            fontSize: '13px',
            color: '#f59e0b',
            lineHeight: '1.6'
          }}>
            <strong>Setup needed:</strong> Add <code style={{ background: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: '4px' }}>VITE_BOT_USERNAME</code> to your Cloudflare build variables (e.g. <code style={{ background: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: '4px' }}>NairaVaultBot</code>) and redeploy.
          </div>
        )}
        <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', maxWidth: '260px' }}>
          Or open this app inside Telegram for automatic sign-in.
        </p>
      </div>
    );
  }

  if (error) {
    const is405 = error.includes('405');
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', gap: '12px' }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <h2 style={{ fontWeight: 700 }}>Connection Error</h2>
        <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px', maxWidth: '280px' }}>
          {error}
        </p>
        {is405 && (
          <p style={{ color: '#f59e0b', fontSize: '12px', maxWidth: '280px', lineHeight: '1.5' }}>
            Set <strong>RAILWAY_URL</strong> in Cloudflare Worker Variables and redeploy.
          </p>
        )}
        <button className="btn-primary" onClick={() => window.location.reload()} style={{ maxWidth: '200px', marginTop: '8px' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = adminRole !== null;

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin}>
      <div className="fade-in-up" key={activeTab}>
        {activeTab === 'home' && <HomePage user={user} />}
        {activeTab === 'cards' && <CardsPage user={user} />}
        {activeTab === 'kyc' && (
          <KYCPage
            user={user}
            onKycUpdated={(status) => refreshUser({ kycStatus: status as any })}
          />
        )}
        {activeTab === 'admin' && isAdmin && <AdminPage adminRole={adminRole!} />}
        {activeTab === 'profile' && (
          <ProfilePage user={user} onLogout={() => { logout(); setIsAdminMode(false); setAdminRole(null); }} />
        )}
      </div>
    </Layout>
  );
}

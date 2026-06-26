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
import { API_BASE, API_TARGET_HOST } from './lib/api';

type Tab = 'home' | 'cards' | 'kyc' | 'profile' | 'admin';

export default function App() {
  const {
    user, loading, error, needsManualLogin,
    loginWithEmail, registerWithEmail, signInWithGoogle,
    logout, refreshUser,
  } = useAuth();
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

  if (needsManualLogin || (!user && !error)) {
    return (
      <AuthPage
        onLogin={loginWithEmail}
        onRegister={registerWithEmail}
        onGoogleSignIn={signInWithGoogle}
        error={error}
      />
    );
  }

  if (error && !user) {
    const is405 = error.includes('405');
    const isNoConnection = error.includes('reach the server');
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', gap: '12px' }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <h2 style={{ fontWeight: 700 }}>Connection Error</h2>
        <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px', maxWidth: '300px' }}>
          {error}
        </p>
        {is405 && (
          <p style={{ color: '#f59e0b', fontSize: '12px', maxWidth: '300px', lineHeight: '1.5' }}>
            This usually means <strong>VITE_API_URL</strong> is missing in your build settings.
            Set it to your backend URL and redeploy.
          </p>
        )}
        {isNoConnection && (
          <p style={{ color: '#f59e0b', fontSize: '12px', maxWidth: '300px', lineHeight: '1.5' }}>
            The app is trying to reach: <strong style={{ wordBreak: 'break-all' }}>{API_TARGET_HOST}</strong>
          </p>
        )}
        <div style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: '10px',
          padding: '10px 14px', fontSize: '11px',
          color: 'var(--tg-theme-hint-color)', maxWidth: '300px',
          wordBreak: 'break-all', lineHeight: '1.6'
        }}>
          <span style={{ opacity: 0.6 }}>API target:</span><br />
          <strong>{API_BASE}</strong>
        </div>
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

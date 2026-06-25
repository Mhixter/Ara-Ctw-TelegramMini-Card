import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CardsPage from './pages/CardsPage';
import KYCPage from './pages/KYCPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import AdminLoginPage from './pages/AdminLoginPage';
import { useAuth } from './hooks/useAuth';

type Tab = 'home' | 'cards' | 'kyc' | 'profile' | 'admin';

export default function App() {
  const { user, loading, error, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);

  // Check if navigating to /admin
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

  if (error || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ fontWeight: 700, marginBottom: '8px' }}>Authentication Failed</h2>
        <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px', marginBottom: '24px' }}>
          {error || 'Could not establish a secure session. Please restart the app.'}
        </p>
        <button className="btn-primary" onClick={() => window.location.reload()} style={{ maxWidth: '200px' }}>
          Retry
        </button>
      </div>
    );
  }

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

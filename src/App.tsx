import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CardsPage from './pages/CardsPage';
import KYCPage from './pages/KYCPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import AdminLoginPage from './pages/AdminLoginPage';
import SendPage from './pages/SendPage';
import AuthPage from './components/AuthPage';
import { useAuth } from './hooks/useAuth';

type Tab = 'home' | 'send' | 'cards' | 'kyc' | 'profile' | 'admin';

export default function App() {
  const { user, loading, error, needsConnect, isInTelegram, authenticate, logout, refreshUser } = useAuth();
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
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '20px',
        background: '#fff',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #6C5CE7, #5548c8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(108,92,231,0.4)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.85 8.72c-.14.63-.51.78-.97.48l-2.67-1.97-1.29 1.24c-.14.14-.26.26-.54.26l.19-2.7 4.91-4.44c.21-.19-.05-.29-.33-.1L7.72 14.5l-2.62-.82c-.57-.18-.58-.57.12-.84l10.26-3.96c.48-.18.9.11.16.92z" fill="white"/>
            </svg>
          </div>
          <div>
            <span style={{ fontSize: '22px', fontWeight: 900, color: '#1a1a2e' }}>Border</span>
            <span style={{ fontSize: '22px', fontWeight: 900, color: '#6C5CE7' }}>Pay</span>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#7474A0', marginBottom: '16px' }}>Signing you in…</p>
          <span className="spinner-accent" style={{ width: 28, height: 28 }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthPage
        isInTelegram={isInTelegram}
        needsConnect={needsConnect}
        error={error}
        onConnect={authenticate}
      />
    );
  }

  const isAdmin = adminRole !== null;

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin}>
      <div className="fade-in-up" key={activeTab}>
        {activeTab === 'home'    && <HomePage user={user} onNavigate={setActiveTab} />}
        {activeTab === 'send'    && <SendPage user={user} />}
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

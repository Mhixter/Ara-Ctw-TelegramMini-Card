import React from 'react';
import { Home, CreditCard, Shield, User, BarChart2, Send } from 'lucide-react';

type Tab = 'home' | 'send' | 'cards' | 'kyc' | 'profile' | 'admin';

interface Props {
  children: React.ReactNode;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isAdmin?: boolean;
}

export default function Layout({ children, activeTab, onTabChange, isAdmin }: Props) {
  return (
    <div style={{ minHeight: '100vh', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ paddingBottom: '88px' }}>
        {children}
      </div>
      <nav className="bottom-nav">
        {/* Home */}
        <button
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => onTabChange('home')}
        >
          <Home size={22} strokeWidth={activeTab === 'home' ? 2.5 : 1.8} />
          <span>Home</span>
        </button>

        {/* Cards */}
        <button
          className={`nav-item ${activeTab === 'cards' ? 'active' : ''}`}
          onClick={() => onTabChange('cards')}
        >
          <CreditCard size={22} strokeWidth={activeTab === 'cards' ? 2.5 : 1.8} />
          <span>Cards</span>
        </button>

        {/* Send — centre action */}
        <button
          className="nav-item nav-send"
          onClick={() => onTabChange('send')}
          style={{
            opacity: activeTab === 'send' ? 0.85 : 1,
            transform: activeTab === 'send' ? 'scale(0.95)' : 'scale(1)',
          }}
        >
          <Send size={18} strokeWidth={2.2} />
          <span>Send</span>
        </button>

        {/* Verify */}
        <button
          className={`nav-item ${activeTab === 'kyc' ? 'active' : ''}`}
          onClick={() => onTabChange('kyc')}
        >
          <Shield size={22} strokeWidth={activeTab === 'kyc' ? 2.5 : 1.8} />
          <span>Verify</span>
        </button>

        {/* Profile or Admin */}
        {isAdmin ? (
          <button
            className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => onTabChange('admin')}
          >
            <BarChart2 size={22} strokeWidth={activeTab === 'admin' ? 2.5 : 1.8} />
            <span>Admin</span>
          </button>
        ) : (
          <button
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => onTabChange('profile')}
          >
            <User size={22} strokeWidth={activeTab === 'profile' ? 2.5 : 1.8} />
            <span>Profile</span>
          </button>
        )}
      </nav>
    </div>
  );
}

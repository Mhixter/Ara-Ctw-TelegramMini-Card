import React from 'react';
import { Home, CreditCard, Shield, User, BarChart2 } from 'lucide-react';

type Tab = 'home' | 'cards' | 'kyc' | 'profile' | 'admin';

interface Props {
  children: React.ReactNode;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isAdmin?: boolean;
}

export default function Layout({ children, activeTab, onTabChange, isAdmin }: Props) {
  const tabs = [
    { id: 'home' as Tab, label: 'Home', icon: Home },
    { id: 'cards' as Tab, label: 'Cards', icon: CreditCard },
    { id: 'kyc' as Tab, label: 'Verify', icon: Shield },
    ...(isAdmin ? [{ id: 'admin' as Tab, label: 'Admin', icon: BarChart2 }] : []),
    { id: 'profile' as Tab, label: 'Profile', icon: User },
  ];

  return (
    <div style={{ minHeight: '100vh', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ paddingBottom: '80px' }}>
        {children}
      </div>
      <nav className="bottom-nav">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} className={`nav-item ${active ? 'active' : ''}`} onClick={() => onTabChange(tab.id)}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

import React, { useState } from 'react';
import { LogOut, Shield, Bell, HelpCircle, FileText, ChevronRight } from 'lucide-react';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';
import SecurityPage from './profile/SecurityPage';
import NotificationsPage from './profile/NotificationsPage';
import HelpPage from './profile/HelpPage';
import TermsPage from './profile/TermsPage';

interface Props { user: User; onLogout: () => void; }

type SubPage = null | 'security' | 'notifications' | 'help' | 'terms';

export default function ProfilePage({ user, onLogout }: Props) {
  const { isInTelegram } = useTelegram();
  const [subPage, setSubPage] = useState<SubPage>(null);

  const kycLabel = {
    PENDING: 'Unverified',
    TIER_1: 'Gold Verified',
    TIER_2: 'Platinum Verified',
    BANNED: 'Banned'
  }[user.kycStatus];

  const kycColor = {
    PENDING: 'var(--warning)',
    TIER_1: 'var(--gold)',
    TIER_2: 'var(--platinum)',
    BANNED: 'var(--danger)'
  }[user.kycStatus];

  if (subPage === 'security')      return <SecurityPage user={user} onBack={() => setSubPage(null)} />;
  if (subPage === 'notifications') return <NotificationsPage onBack={() => setSubPage(null)} />;
  if (subPage === 'help')          return <HelpPage onBack={() => setSubPage(null)} />;
  if (subPage === 'terms')         return <TermsPage onBack={() => setSubPage(null)} />;

  const menuItems = [
    {
      icon: Shield,
      color: 'var(--success)',
      label: 'Security & Privacy',
      desc: 'Encryption, session info & data policy',
      badge: 'Active',
      badgeColor: 'var(--success)',
      action: () => setSubPage('security')
    },
    {
      icon: Bell,
      color: 'var(--accent)',
      label: 'Notifications',
      desc: 'Transaction alerts & bot messages',
      badge: null,
      badgeColor: '',
      action: () => setSubPage('notifications')
    },
    {
      icon: HelpCircle,
      color: 'var(--gold)',
      label: 'Help & Support',
      desc: 'FAQ, contact and documentation',
      badge: null,
      badgeColor: '',
      action: () => setSubPage('help')
    },
    {
      icon: FileText,
      color: 'var(--platinum)',
      label: 'Terms of Service',
      desc: 'Legal documentation · Nigeria jurisdiction',
      badge: null,
      badgeColor: '',
      action: () => setSubPage('terms')
    },
  ];

  return (
    <div className="page" style={{ paddingTop: '20px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px' }}>Profile</h1>

      {/* Profile Card */}
      <div className="glass" style={{ padding: '24px', marginBottom: '20px', textAlign: 'center' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 14px',
          background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', fontWeight: 800, color: 'white',
          boxShadow: '0 8px 24px var(--accent-glow)'
        }}>
          {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
        </div>
        <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
          {user.firstName || user.username || `User ${user.telegramId}`}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '12px' }}>
          {user.username ? `@${user.username}` : `TG ID: ${user.telegramId}`}
        </p>
        <span className="badge" style={{
          background: `${kycColor}18`,
          color: kycColor,
          border: `1px solid ${kycColor}40`
        }}>
          {kycLabel}
        </span>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Platform', value: isInTelegram ? 'Telegram' : 'Browser' },
          { label: 'Status', value: user.isActive ? 'Active' : 'Inactive' },
          { label: 'KYC Tier', value: user.kycStatus === 'PENDING' ? 'None' : user.kycStatus === 'TIER_1' ? 'Gold' : user.kycStatus === 'TIER_2' ? 'Platinum' : 'Banned' }
        ].map(stat => (
          <div key={stat.label} className="glass" style={{ padding: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>{stat.value}</p>
            <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Auth Method Info */}
      <div className="glass" style={{ padding: '14px 16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.2)' }}>
        <Shield size={18} color="var(--success)" style={{ flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)', marginBottom: '1px' }}>
            {isInTelegram ? 'Telegram HMAC-SHA256 Auth' : 'Persistent Guest Session'}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>
            {isInTelegram
              ? 'Session verified using your Telegram bot token signature'
              : 'Same guest ID persists across browser sessions via localStorage'}
          </p>
        </div>
      </div>

      {/* Menu Items */}
      <div className="glass" style={{ marginBottom: '20px', overflow: 'hidden' }}>
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={item.label}>
              <button
                onClick={item.action}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '16px', background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--tg-theme-text-color)', textAlign: 'left', transition: 'background 0.15s'
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                  background: `${item.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={19} color={item.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{item.label}</p>
                  <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>{item.desc}</p>
                </div>
                {item.badge && (
                  <span style={{ fontSize: '10px', fontWeight: 700, color: item.badgeColor, background: `${item.badgeColor}15`, padding: '2px 8px', borderRadius: '10px', border: `1px solid ${item.badgeColor}30`, marginRight: '4px' }}>
                    {item.badge}
                  </span>
                )}
                <ChevronRight size={16} color="var(--tg-theme-hint-color)" />
              </button>
              {i < menuItems.length - 1 && (
                <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0 16px' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="btn-ghost"
        style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'var(--danger)' }}
      >
        <LogOut size={16} /> Sign Out
      </button>

      <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginTop: '24px' }}>
        NairaVault v1.0.0 · Powered by Ara Tech
      </p>
    </div>
  );
}

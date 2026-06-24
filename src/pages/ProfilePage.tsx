import React from 'react';
import { LogOut, User as UserIcon, Shield, Bell, HelpCircle, ExternalLink } from 'lucide-react';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';

interface Props { user: User; onLogout: () => void; }

export default function ProfilePage({ user, onLogout }: Props) {
  const { isInTelegram } = useTelegram();

  const kycLabel = { PENDING: 'Unverified', TIER_1: 'Gold Verified', TIER_2: 'Platinum Verified', BANNED: 'Banned' }[user.kycStatus];
  const kycColor = { PENDING: 'var(--warning)', TIER_1: 'var(--gold)', TIER_2: 'var(--platinum)', BANNED: 'var(--danger)' }[user.kycStatus];

  const menuItems = [
    { icon: Shield, label: 'Security & Privacy', desc: 'AES-256-GCM encryption enabled', action: () => {} },
    { icon: Bell, label: 'Notifications', desc: 'Transaction alerts', action: () => {} },
    { icon: HelpCircle, label: 'Help & Support', desc: 'FAQ and contact support', action: () => {} },
    { icon: ExternalLink, label: 'Terms of Service', desc: 'Legal documentation', action: () => {} },
  ];

  return (
    <div className="page" style={{ paddingTop: '20px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px' }}>Profile</h1>

      {/* Profile Card */}
      <div className="glass" style={{ padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
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
          {user.username ? `@${user.username}` : `TG: ${user.telegramId}`}
        </p>
        <span className="badge" style={{ background: `${kycColor}18`, color: kycColor, border: `1px solid ${kycColor}40` }}>
          {kycLabel}
        </span>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
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

      {/* Menu Items */}
      <div className="glass" style={{ marginBottom: '20px', overflow: 'hidden' }}>
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={item.label}>
              <button onClick={item.action} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                padding: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'white', textAlign: 'left'
              }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(108,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color="var(--accent)" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>{item.label}</p>
                  <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginTop: '1px' }}>{item.desc}</p>
                </div>
                <ExternalLink size={14} color="var(--tg-theme-hint-color)" />
              </button>
              {i < menuItems.length - 1 && <div className="divider" style={{ margin: '0 16px' }} />}
            </div>
          );
        })}
      </div>

      {/* Security Info */}
      <div className="glass" style={{ padding: '14px', marginBottom: '20px', background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.2)' }}>
        <p style={{ fontSize: '12px', color: 'rgba(34,197,94,0.9)', lineHeight: 1.6 }}>
          🔒 Your session is secured with JWT. All financial data uses double-entry ledger accounting. Card data encrypted with AES-256-GCM.
        </p>
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
        NairaVault v1.0.0 · Powered by Replit
      </p>
    </div>
  );
}

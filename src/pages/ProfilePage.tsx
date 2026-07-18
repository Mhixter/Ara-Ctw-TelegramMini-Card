import React, { useState } from 'react';
import { LogOut, Shield, Bell, HelpCircle, FileText, ChevronRight, Settings, Gift, BarChart3, Smartphone, Globe, Info } from 'lucide-react';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';
import SecurityPage from './profile/SecurityPage';
import NotificationsPage from './profile/NotificationsPage';
import HelpPage from './profile/HelpPage';
import TermsPage from './profile/TermsPage';

interface Props { user: User; onLogout: () => void; }

type SubPage = null | 'security' | 'notifications' | 'help' | 'terms' | 'settings';

export default function ProfilePage({ user, onLogout }: Props) {
  const { isInTelegram } = useTelegram();
  const [subPage, setSubPage] = useState<SubPage>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const kycLabel: Record<string, string> = {
    PENDING: 'Unverified',
    PENDING_REVIEW: 'Under Review',
    TIER_1: 'Gold Verified',
    TIER_2: 'Platinum Verified',
    BANNED: 'Banned',
  };
  const kycColor: Record<string, string> = {
    PENDING: 'var(--warning)',
    PENDING_REVIEW: 'var(--accent)',
    TIER_1: 'var(--gold)',
    TIER_2: 'var(--platinum)',
    BANNED: 'var(--danger)',
  };

  if (subPage === 'security')      return <SecurityPage user={user} onBack={() => setSubPage(null)} />;
  if (subPage === 'notifications') return <NotificationsPage onBack={() => setSubPage(null)} />;
  if (subPage === 'help')          return <HelpPage onBack={() => setSubPage(null)} />;
  if (subPage === 'terms')         return <TermsPage onBack={() => setSubPage(null)} />;
  if (subPage === 'settings')      return <SettingsInline onBack={() => setSubPage(null)} />;

  const menuGroups = [
    {
      title: 'Account',
      items: [
        { icon: Shield, color: 'var(--success)', label: 'Security & Privacy', desc: 'Encryption, session info & data policy', badge: 'Active', badgeColor: 'var(--success)', action: () => setSubPage('security') },
        { icon: Bell, color: 'var(--accent)', label: 'Notifications', desc: 'Transaction alerts & bot messages', badge: null, badgeColor: '', action: () => setSubPage('notifications') },
        { icon: Settings, color: 'var(--tg-theme-hint-color)', label: 'Settings', desc: 'Appearance, language, currency & more', badge: null, badgeColor: '', action: () => setSubPage('settings') },
      ]
    },
    {
      title: 'More',
      items: [
        { icon: Gift, color: 'var(--gold)', label: 'Referral Program', desc: 'Invite friends, earn rewards', badge: null, badgeColor: '', action: () => {} },
        { icon: BarChart3, color: '#06b6d4', label: 'Analytics', desc: 'Spending insights & reports', badge: null, badgeColor: '', action: () => {} },
        { icon: Smartphone, color: '#8b5cf6', label: 'Connected Devices', desc: 'Manage active sessions', badge: null, badgeColor: '', action: () => {} },
      ]
    },
    {
      title: 'Info',
      items: [
        { icon: HelpCircle, color: 'var(--warning)', label: 'Help & Support', desc: 'FAQ, contact and documentation', badge: null, badgeColor: '', action: () => setSubPage('help') },
        { icon: FileText, color: 'var(--platinum)', label: 'Terms of Service', desc: 'Legal documentation · Nigeria jurisdiction', badge: null, badgeColor: '', action: () => setSubPage('terms') },
        { icon: Info, color: 'var(--tg-theme-hint-color)', label: 'About BorderPay', desc: 'Version 1.0.0 · Powered by Ara Tech', badge: null, badgeColor: '', action: () => {} },
      ]
    }
  ];

  return (
    <div className="page" style={{ paddingTop: '20px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '22px', letterSpacing: '-0.5px' }}>Profile</h1>

      {/* Profile Card */}
      <div className="glass" style={{ padding: '24px', marginBottom: '18px', textAlign: 'center', borderRadius: '24px' }}>
        {/* Avatar */}
        <div style={{ position: 'relative', width: '76px', margin: '0 auto 14px' }}>
          <div style={{
            width: '76px', height: '76px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '30px', fontWeight: 800, color: 'white',
            boxShadow: '0 8px 28px var(--accent-glow)',
          }}>
            {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
          </div>
          {/* Verified badge */}
          {(user.kycStatus === 'TIER_1' || user.kycStatus === 'TIER_2') && (
            <div style={{
              position: 'absolute', bottom: '0', right: '0',
              width: '22px', height: '22px', borderRadius: '50%',
              background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--tg-theme-bg-color)', fontSize: '11px',
            }}>
              ✓
            </div>
          )}
        </div>

        <p style={{ fontSize: '19px', fontWeight: 800, marginBottom: '3px', letterSpacing: '-0.4px' }}>
          {user.firstName || user.username || `User ${user.telegramId}`}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '12px' }}>
          {user.username ? `@${user.username}` : `TG ID: ${user.telegramId}`}
        </p>
        <span className="badge" style={{
          background: `${kycColor[user.kycStatus] || 'var(--warning)'}18`,
          color: kycColor[user.kycStatus] || 'var(--warning)',
          border: `1px solid ${kycColor[user.kycStatus] || 'var(--warning)'}35`,
          fontSize: '11px', padding: '4px 12px',
        }}>
          {kycLabel[user.kycStatus] || 'Unverified'}
        </span>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '18px' }}>
        {[
          { label: 'Platform', value: isInTelegram ? '📱 Telegram' : '🌐 Browser', small: true },
          { label: 'Status', value: user.isActive ? '🟢 Active' : '🔴 Inactive', small: false },
          { label: 'KYC Tier', value: ({ PENDING: '—', PENDING_REVIEW: '⏳', TIER_1: '🥇 Gold', TIER_2: '🏆 Plat', BANNED: '🚫' } as Record<string,string>)[user.kycStatus] || '—', small: false }
        ].map(stat => (
          <div key={stat.label} className="glass" style={{ padding: '12px 8px', textAlign: 'center', borderRadius: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '3px', letterSpacing: '-0.1px' }}>{stat.value}</p>
            <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Auth Method */}
      <div className="glass" style={{ padding: '13px 15px', marginBottom: '18px', display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.18)', borderRadius: '16px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Shield size={18} color="var(--success)" />
        </div>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--success)', marginBottom: '1px' }}>
            {isInTelegram ? 'Telegram HMAC-SHA256 Auth' : 'Persistent Guest Session'}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', lineHeight: 1.4 }}>
            {isInTelegram
              ? 'Session verified using your Telegram bot token signature'
              : 'Same guest ID persists via localStorage'}
          </p>
        </div>
      </div>

      {/* Menu Groups */}
      {menuGroups.map(group => (
        <div key={group.title} style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tg-theme-hint-color)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>
            {group.title}
          </p>
          <div className="glass" style={{ overflow: 'hidden', borderRadius: '20px' }}>
            {group.items.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  <button
                    onClick={item.action}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '13px',
                      padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--tg-theme-text-color)', textAlign: 'left', transition: 'background 0.15s'
                    }}
                  >
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0,
                      background: `${item.color}14`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={18} color={item.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1px', letterSpacing: '-0.1px' }}>{item.label}</p>
                      <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', lineHeight: 1.3 }}>{item.desc}</p>
                    </div>
                    {item.badge && (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: item.badgeColor, background: `${item.badgeColor}12`, padding: '2px 8px', borderRadius: '8px', border: `1px solid ${item.badgeColor}28`, marginRight: '4px' }}>
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight size={15} color="var(--tg-theme-hint-color)" />
                  </button>
                  {i < group.items.length - 1 && (
                    <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0 16px' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Logout Button */}
      <button
        onClick={() => setShowLogoutConfirm(true)}
        className="btn-ghost"
        style={{ borderColor: 'rgba(239,68,68,0.25)', color: 'var(--danger)', marginTop: '8px' }}
      >
        <LogOut size={16} /> Sign Out
      </button>

      <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginTop: '24px', letterSpacing: '0.2px' }}>
        BorderPay v1.0.0 · Powered by Ara Tech
      </p>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="glass-strong modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"><div className="modal-handle-bar" /></div>
            <div style={{ textAlign: 'center', padding: '0 8px 8px' }}>
              <div style={{ fontSize: '44px', marginBottom: '14px' }}>👋</div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.4px' }}>Sign Out?</h3>
              <p style={{ fontSize: '14px', color: 'var(--tg-theme-hint-color)', lineHeight: 1.6, marginBottom: '24px' }}>
                You'll need to reconnect with Telegram to use BorderPay again.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                <button
                  style={{ flex: 1, padding: '14px', borderRadius: '16px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)', fontWeight: 700, fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Settings Page (simple, within the same file for brevity)
function SettingsInline({ onBack }: { onBack: () => void }) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [currency, setCurrency] = useState('NGN');
  const [language, setLanguage] = useState('en');
  const [biometric, setBiometric] = useState(true);
  const [notifs, setNotifs] = useState(true);
  const [devMode, setDevMode] = useState(false);

  return (
    <div className="page" style={{ paddingTop: '20px' }}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '5px', padding: 0, fontWeight: 600 }}
      >
        ← Back
      </button>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px', letterSpacing: '-0.5px' }}>Settings</h1>

      {/* Appearance */}
      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tg-theme-hint-color)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>Appearance</p>
      <div className="glass" style={{ padding: '16px', marginBottom: '16px', borderRadius: '20px' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Theme</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {(['light', 'dark', 'auto'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                padding: '10px 8px', borderRadius: '12px', border: '1px solid',
                borderColor: theme === t ? 'var(--accent)' : 'var(--glass-border)',
                background: theme === t ? 'rgba(108,92,231,0.1)' : 'transparent',
                color: theme === t ? 'var(--accent)' : 'var(--tg-theme-hint-color)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              }}
            >
              <span style={{ fontSize: '18px' }}>{t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '🌓'}</span>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tg-theme-hint-color)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>Preferences</p>
      <div className="glass" style={{ marginBottom: '16px', overflow: 'hidden', borderRadius: '20px' }}>
        {[
          { label: 'Language', value: language, icon: '🌐', options: [{ v: 'en', l: 'English' }, { v: 'fr', l: 'French' }, { v: 'es', l: 'Spanish' }] },
          { label: 'Currency', value: currency, icon: '💰', options: [{ v: 'NGN', l: '₦ NGN' }, { v: 'USD', l: '$ USD' }, { v: 'EUR', l: '€ EUR' }, { v: 'GBP', l: '£ GBP' }] },
        ].map((pref, i) => (
          <div key={pref.label}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>{pref.icon}</span>
              <span style={{ flex: 1, fontSize: '14px', fontWeight: 600 }}>{pref.label}</span>
              <select
                value={pref.value}
                onChange={e => pref.label === 'Language' ? setLanguage(e.target.value) : setCurrency(e.target.value)}
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--tg-theme-text-color)', fontSize: '13px', padding: '4px 8px', fontFamily: 'inherit', cursor: 'pointer' }}
              >
                {pref.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
            {i === 0 && <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0 16px' }} />}
          </div>
        ))}
      </div>

      {/* Security */}
      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tg-theme-hint-color)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>Security</p>
      <div className="glass" style={{ marginBottom: '16px', overflow: 'hidden', borderRadius: '20px' }}>
        {[
          { label: 'Biometric Login', desc: 'Use Face ID or fingerprint', value: biometric, set: setBiometric, icon: '🔏' },
          { label: 'Notifications', desc: 'Payment & security alerts', value: notifs, set: setNotifs, icon: '🔔' },
          { label: 'Developer Mode', desc: 'Show debug info', value: devMode, set: setDevMode, icon: '🛠' },
        ].map((item, i) => (
          <div key={item.label}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>{item.label}</p>
                <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>{item.desc}</p>
              </div>
              <div
                className={`toggle-track ${item.value ? 'on' : ''}`}
                style={{ background: item.value ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }}
                onClick={() => item.set(!item.value)}
              >
                <div className="toggle-thumb" />
              </div>
            </div>
            {i < 2 && <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0 16px' }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  LogOut, Shield, Bell, HelpCircle, FileText, ChevronRight,
  User as UserIcon, Lock, Key, Users, SlidersHorizontal, Smartphone,
  Clock, X, Info
} from 'lucide-react';
import { User } from '../hooks/useAuth';
import SecurityPage from './profile/SecurityPage';
import NotificationsPage from './profile/NotificationsPage';
import HelpPage from './profile/HelpPage';
import TermsPage from './profile/TermsPage';
import PersonalInfoPage from './profile/PersonalInfoPage';
import ReferralPage from './profile/ReferralPage';
import LimitsPage from './profile/LimitsPage';
import PrivacyPolicyPage from './profile/PrivacyPolicyPage';
import AboutPage from './profile/AboutPage';

interface Props { user: User; onLogout: () => void; }
type SubPage = null | 'security' | 'notifications' | 'help' | 'terms' | 'personalinfo' | 'referral' | 'limits' | 'privacy' | 'about' | 'apikeys' | 'devices' | 'loginhistory';

export default function ProfilePage({ user, onLogout }: Props) {
  const [subPage, setSubPage]   = useState<SubPage>(null);
  const [showLogout, setShowLogout] = useState(false);

  if (subPage === 'security')      return <SecurityPage user={user} onBack={() => setSubPage(null)} />;
  if (subPage === 'notifications') return <NotificationsPage onBack={() => setSubPage(null)} />;
  if (subPage === 'help')          return <HelpPage onBack={() => setSubPage(null)} />;
  if (subPage === 'terms')         return <TermsPage onBack={() => setSubPage(null)} />;
  if (subPage === 'personalinfo')  return <PersonalInfoPage user={user} onBack={() => setSubPage(null)} />;
  if (subPage === 'referral')      return <ReferralPage user={user} onBack={() => setSubPage(null)} />;
  if (subPage === 'limits')        return <LimitsPage user={user} onBack={() => setSubPage(null)} />;
  if (subPage === 'privacy')       return <PrivacyPolicyPage onBack={() => setSubPage(null)} />;
  if (subPage === 'about')         return <AboutPage onBack={() => setSubPage(null)} />;

  if (subPage === 'apikeys') return (
    <div className="page" style={{ paddingTop: '16px' }}>
      <button onClick={() => setSubPage(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer', marginBottom: '24px', padding: 0, fontFamily: 'inherit', fontWeight: 700 }}>
        <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Back
      </button>
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔑</div>
        <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '8px' }}>API Access</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>Developer API key management is coming soon. You'll be able to generate keys for third-party integrations.</p>
      </div>
    </div>
  );

  if (subPage === 'devices') return (
    <div className="page" style={{ paddingTop: '16px' }}>
      <button onClick={() => setSubPage(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer', marginBottom: '24px', padding: 0, fontFamily: 'inherit', fontWeight: 700 }}>
        <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Back
      </button>
      <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '4px' }}>Connected Devices</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Devices with active sessions</p>
      <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smartphone size={20} color="var(--emerald)" />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 800 }}>Telegram Mobile</p>
            <p style={{ fontSize: '12px', color: 'var(--emerald)', fontWeight: 700 }}>● Active now</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>This device · Signed in via Telegram</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (subPage === 'loginhistory') return (
    <div className="page" style={{ paddingTop: '16px' }}>
      <button onClick={() => setSubPage(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer', marginBottom: '24px', padding: 0, fontFamily: 'inherit', fontWeight: 700 }}>
        <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Back
      </button>
      <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '4px' }}>Login History</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Your recent account activity</p>
      <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(108,92,231,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} color="var(--purple)" />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 800 }}>Telegram Login</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Just now · via Telegram Mini App</p>
            <p style={{ fontSize: '11px', color: 'var(--emerald)', fontWeight: 700 }}>Current session</p>
          </div>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-hint)', marginTop: '14px' }}>Full login history coming soon.</p>
      </div>
    </div>
  );

  const kycLabel: Record<string, string> = {
    PENDING: 'Unverified', PENDING_REVIEW: 'Under Review',
    TIER_1: 'KYC Level 1', TIER_2: 'KYC Level 2', BANNED: 'Banned',
  };
  const kycColor: Record<string, string> = {
    PENDING: 'var(--warning)', PENDING_REVIEW: 'var(--accent)',
    TIER_1: 'var(--emerald)', TIER_2: 'var(--purple)', BANNED: 'var(--danger)',
  };
  const membershipLabel = user.kycStatus === 'TIER_2' ? 'Premium' : user.kycStatus === 'TIER_1' ? 'Verified' : 'Basic';
  const membershipColor = user.kycStatus === 'TIER_2' ? 'var(--gold-dark)' : user.kycStatus === 'TIER_1' ? 'var(--emerald)' : 'var(--text-muted)';

  const menuGroups = [
    {
      items: [
        { icon: UserIcon, color: '#6C5CE7', label: 'Personal Information', desc: 'Update your personal details', badge: null, action: () => setSubPage('personalinfo') },
        { icon: Lock, color: '#22C55E', label: 'Security', desc: 'Password, 2FA, PIN, and security preferences', badge: 'Secure', badgeColor: 'var(--emerald)', action: () => setSubPage('security') },
        { icon: Bell, color: '#6C5CE7', label: 'Notifications', desc: 'Manage your notification preferences', badge: 'Enabled', badgeColor: 'var(--emerald)', action: () => setSubPage('notifications') },
        { icon: Key, color: '#F4B400', label: 'API Keys', desc: 'Generate and manage your API keys', badge: null, action: () => setSubPage('apikeys') },
      ],
    },
    {
      items: [
        { icon: Users, color: '#22C55E', label: 'Referral Program', desc: 'Invite friends and earn rewards', badge: null, action: () => setSubPage('referral') },
        { icon: SlidersHorizontal, color: '#6C5CE7', label: 'Limits', desc: 'View and manage your transaction limits', badge: 'View Limits', badgeColor: 'var(--purple)', action: () => setSubPage('limits') },
        { icon: Smartphone, color: '#EF4444', label: 'Connected Devices', desc: 'Manage devices connected to your account', badge: null, action: () => setSubPage('devices') },
        { icon: Clock, color: '#7474A0', label: 'Login History', desc: 'Review your recent login activity', badge: null, action: () => setSubPage('loginhistory') },
      ],
    },
    {
      items: [
        { icon: HelpCircle, color: '#F4B400', label: 'Help Center', desc: 'Get help and support', badge: null, action: () => setSubPage('help') },
        { icon: FileText, color: '#22C55E', label: 'Terms of Service', desc: 'Read our terms and conditions', badge: null, action: () => setSubPage('terms') },
        { icon: Shield, color: '#6C5CE7', label: 'Privacy Policy', desc: 'Learn how we protect your data', badge: null, action: () => setSubPage('privacy') },
        { icon: Info, color: '#7474A0', label: 'About BorderPay', desc: 'Learn more about the BorderPay platform', badge: null, action: () => setSubPage('about') },
      ],
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)' }}>My Profile</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Manage your account and preferences</p>
        </div>
        <button className="icon-btn" style={{ position: 'relative' }}>
          <Bell size={18} color="var(--text-muted)" />
          <div className="notif-dot" />
        </button>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* Profile Card */}
        <div style={{ background: 'var(--surface)', borderRadius: '24px', padding: '24px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)', textAlign: 'center', position: 'relative' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', width: '80px', margin: '0 auto 14px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--purple), #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', fontWeight: 900, color: '#fff',
              boxShadow: '0 8px 24px rgba(108,92,231,0.35)',
            }}>
              {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
            </div>
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: '24px', height: '24px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--purple), #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--surface)',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="white"/>
              </svg>
            </div>
          </div>

          {/* Name */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text)' }}>
              {user.firstName || user.username || `User ${user.telegramId}`}
            </h2>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#6C5CE7"/>
              <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          {user.username && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '14px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.85 8.72c-.14.63-.51.78-.97.48l-2.67-1.97-1.29 1.24c-.14.14-.26.26-.54.26l.19-2.7 4.91-4.44c.21-.19-.05-.29-.33-.1L7.72 14.5l-2.62-.82c-.57-.18-.58-.57.12-.84l10.26-3.96c.48-.18.9.11.16.92z" fill="#6C5CE7"/>
              </svg>
              <span style={{ fontSize: '14px', color: 'var(--purple)', fontWeight: 700 }}>@{user.username}</span>
            </div>
          )}

          {/* Status badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <span className="badge badge-success" style={{ fontSize: '11px' }}>
              ✓ {kycLabel[user.kycStatus] || 'Unverified'}
            </span>
            <span className="badge badge-success" style={{ fontSize: '11px' }}>
              ● Account Active
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(244,180,0,0.12)', color: membershipColor, border: `1px solid rgba(244,180,0,0.25)` }}>
              ⭐ {membershipLabel}
            </span>
          </div>

          {/* Email / Phone */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>📱 Telegram ID: {user.telegramId}</span>
            <span>🌐 {user.isActive ? 'Active' : 'Inactive'}</span>
          </div>
        </div>

        {/* Invite & Earn card */}
        <div style={{
          background: 'linear-gradient(135deg, #6C5CE7, #8B5CF6)',
          borderRadius: '20px', padding: '20px', marginBottom: '16px',
          color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 8px 28px rgba(108,92,231,0.35)',
        }}>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 900, marginBottom: '4px' }}>Invite &amp; Earn</p>
            <p style={{ fontSize: '12px', opacity: 0.85, marginBottom: '12px' }}>Invite friends and earn up to ₦5,000 for each successful referral.</p>
            <button style={{
              padding: '8px 18px', borderRadius: '20px', border: 'none',
              background: '#fff', color: 'var(--purple)', fontWeight: 800,
              fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              Invite Now →
            </button>
          </div>
          <div style={{ fontSize: '48px', opacity: 0.9 }}>🎁</div>
        </div>

        {/* Menu groups */}
        {menuGroups.map((group, gi) => (
          <div key={gi} style={{ background: 'var(--surface)', borderRadius: '20px', marginBottom: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            {group.items.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  <button
                    onClick={item.action}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '16px', background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text)', textAlign: 'left', transition: 'background 0.15s',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                      background: `${item.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={19} color={item.color} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>{item.label}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.desc}</p>
                    </div>
                    {item.badge && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: item.badgeColor, background: `${item.badgeColor}18`, padding: '2px 8px', borderRadius: '10px', marginRight: '4px', whiteSpace: 'nowrap' }}>
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight size={16} color="var(--text-hint)" />
                  </button>
                  {i < group.items.length - 1 && <div style={{ height: '1px', background: 'var(--border-sm)', margin: '0 16px' }} />}
                </div>
              );
            })}
          </div>
        ))}

        {/* Sign Out */}
        <button
          onClick={() => setShowLogout(true)}
          style={{
            width: '100%', padding: '16px', borderRadius: '16px',
            background: 'rgba(239,68,68,0.06)', border: '1.5px solid rgba(239,68,68,0.2)',
            color: 'var(--danger)', fontWeight: 800, fontSize: '15px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontFamily: 'inherit', marginBottom: '20px',
          }}
        >
          <LogOut size={18} /> Sign Out
        </button>
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-hint)', marginBottom: '20px' }}>
          You will be signed out of all devices
        </p>
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-hint)' }}>
          BorderPay v1.0.0 · Powered by Ara Tech
        </p>
      </div>

      {/* Sign Out confirmation modal */}
      {showLogout && (
        <div className="modal-centre">
          <div className="modal-centre-card">
            <button
              onClick={() => setShowLogout(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-hint)', padding: '4px' }}
            >
              <X size={18} />
            </button>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <LogOut size={28} color="var(--danger)" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '8px' }}>Sign Out</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>Are you sure you want to sign out?</p>
            <p style={{ fontSize: '12px', color: 'var(--text-hint)', marginBottom: '28px' }}>You will be signed out of all sessions on all devices.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" onClick={() => setShowLogout(false)} style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                onClick={() => { setShowLogout(false); onLogout(); }}
                style={{
                  flex: 1, padding: '13px', borderRadius: 'var(--radius-sm)', border: 'none',
                  background: 'var(--danger)', color: '#fff', fontWeight: 800, fontSize: '14px',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

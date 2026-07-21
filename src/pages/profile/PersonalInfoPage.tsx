import React from 'react';
import { ChevronLeft, User, Hash, Star, Shield, Calendar } from 'lucide-react';
import { User as UserType } from '../../hooks/useAuth';

interface Props { user: UserType; onBack: () => void; }

const kycLabel: Record<string, string> = {
  PENDING: 'Unverified', PENDING_REVIEW: 'Under Review',
  TIER_1: 'KYC Level 1', TIER_2: 'KYC Level 2', BANNED: 'Banned',
};
const kycColor: Record<string, string> = {
  PENDING: 'var(--warning)', PENDING_REVIEW: 'var(--accent)',
  TIER_1: 'var(--emerald)', TIER_2: 'var(--purple)', BANNED: 'var(--danger)',
};

export default function PersonalInfoPage({ user, onBack }: Props) {
  const fields = [
    { icon: User,     color: '#6C5CE7', label: 'Display Name',   value: user.firstName || user.username || `User ${user.telegramId}` },
    { icon: Hash,     color: '#22C55E', label: 'Telegram ID',    value: String(user.telegramId) },
    { icon: User,     color: '#8B5CF6', label: 'Username',       value: user.username ? `@${user.username}` : '—' },
    { icon: Shield,   color: '#F4B400', label: 'KYC Status',     value: kycLabel[user.kycStatus] || user.kycStatus },
    { icon: Star,     color: '#EF4444', label: 'Membership',     value: user.kycStatus === 'TIER_2' ? 'Premium' : user.kycStatus === 'TIER_1' ? 'Verified' : 'Basic' },
    { icon: Calendar, color: '#7474A0', label: 'Account Status', value: user.isActive ? 'Active' : 'Inactive' },
  ];

  return (
    <div className="page" style={{ paddingTop: '16px' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', padding: 0, fontFamily: 'inherit', fontWeight: 700 }}>
        <ChevronLeft size={18} /> Back
      </button>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '4px' }}>Personal Information</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Your account details from Telegram</p>
      </div>

      {/* Avatar */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--purple), #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px', fontWeight: 900, color: '#fff',
          boxShadow: '0 8px 24px rgba(108,92,231,0.35)', margin: '0 auto 12px',
        }}>
          {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 12px', borderRadius: '20px', background: `${kycColor[user.kycStatus] || 'var(--text-muted)'}18`, color: kycColor[user.kycStatus] || 'var(--text-muted)' }}>
          {kycLabel[user.kycStatus] || 'Unknown'}
        </span>
      </div>

      {/* Fields */}
      <div style={{ background: 'var(--surface)', borderRadius: '20px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        {fields.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={f.label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color={f.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>{f.label}</p>
                  <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>{f.value}</p>
                </div>
              </div>
              {i < fields.length - 1 && <div style={{ height: '1px', background: 'var(--border-sm)', margin: '0 16px' }} />}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '20px', padding: '14px 16px', borderRadius: '14px', background: 'rgba(108,92,231,0.06)', border: '1px solid rgba(108,92,231,0.15)' }}>
        <p style={{ fontSize: '12px', color: 'var(--purple)', fontWeight: 600 }}>
          ℹ Your profile is linked to your Telegram account. To update your name or username, change it in Telegram and re-login.
        </p>
      </div>
    </div>
  );
}

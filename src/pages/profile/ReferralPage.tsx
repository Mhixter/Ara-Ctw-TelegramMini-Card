import React, { useState } from 'react';
import { ChevronLeft, Copy, CheckCircle2, Gift, Users, TrendingUp } from 'lucide-react';
import { User } from '../../hooks/useAuth';

interface Props { user: User; onBack: () => void; }

export default function ReferralPage({ user, onBack }: Props) {
  const [copied, setCopied] = useState(false);
  const referralCode = `BP${user.telegramId}`;
  const referralLink = `https://t.me/BorderPayBot?start=${referralCode}`;

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const stats = [
    { icon: Users,     color: '#6C5CE7', label: 'Total Referrals',  value: '0' },
    { icon: TrendingUp, color: '#22C55E', label: 'Earnings',         value: '₦0' },
    { icon: Gift,       color: '#F4B400', label: 'Per Referral',     value: '₦5,000' },
  ];

  return (
    <div className="page" style={{ paddingTop: '16px' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', padding: 0, fontFamily: 'inherit', fontWeight: 700 }}>
        <ChevronLeft size={18} /> Back
      </button>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #6C5CE7, #8B5CF6)', borderRadius: '24px', padding: '28px 24px', marginBottom: '20px', color: '#fff', textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 12px 36px rgba(108,92,231,0.4)' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎁</div>
        <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '6px' }}>Invite & Earn</h2>
        <p style={{ fontSize: '13px', opacity: 0.85 }}>Earn ₦5,000 for every friend who signs up and completes KYC using your referral link.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ background: 'var(--surface)', borderRadius: '16px', padding: '14px 10px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                <Icon size={16} color={s.color} />
              </div>
              <p style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text)', marginBottom: '2px' }}>{s.value}</p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.2 }}>{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Referral Code */}
      <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '12px', boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.5px' }}>YOUR REFERRAL CODE</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--surface-2)', borderRadius: '14px', marginBottom: '14px' }}>
          <span style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '2px', color: 'var(--purple)', fontFamily: 'monospace' }}>{referralCode}</span>
          <button onClick={() => copy(referralCode)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(108,92,231,0.1)', border: 'none', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', color: copied ? 'var(--emerald)' : 'var(--purple)', fontWeight: 700, fontSize: '13px', fontFamily: 'inherit' }}>
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.5px' }}>REFERRAL LINK</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <p style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'var(--surface-2)', borderRadius: '10px', padding: '10px 12px' }}>{referralLink}</p>
          <button onClick={() => copy(referralLink)} style={{ flexShrink: 0, background: 'var(--accent)', border: 'none', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: '13px', fontFamily: 'inherit' }}>
            Copy Link
          </button>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px' }}>How it works</p>
        {[
          { step: '1', text: 'Share your referral link or code with a friend' },
          { step: '2', text: 'Friend signs up using your link and completes KYC' },
          { step: '3', text: 'You both earn ₦5,000 added to your wallets' },
        ].map(s => (
          <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(108,92,231,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900, fontSize: '14px', color: 'var(--purple)' }}>{s.step}</div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

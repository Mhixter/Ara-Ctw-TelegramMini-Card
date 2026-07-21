import React from 'react';
import { ChevronLeft, Shield, CheckCircle } from 'lucide-react';
import { User } from '../../hooks/useAuth';

interface Props { user: User; onBack: () => void; }

export default function LimitsPage({ user, onBack }: Props) {
  const tier = user.kycStatus;
  const isT1 = tier === 'TIER_1' || tier === 'TIER_2';
  const isT2 = tier === 'TIER_2';

  const tiers = [
    {
      name: 'Basic (Unverified)',
      color: 'var(--text-muted)',
      bg: 'rgba(116,116,160,0.08)',
      active: tier === 'PENDING',
      limits: [
        { label: 'P2P Send (per tx)', value: '—' },
        { label: 'Daily Send Limit', value: '—' },
        { label: 'Card Daily Limit', value: '—' },
        { label: 'Card Monthly Limit', value: '—' },
        { label: 'Virtual Card', value: 'Not available' },
      ],
    },
    {
      name: 'KYC Level 1',
      color: 'var(--emerald)',
      bg: 'rgba(34,197,94,0.08)',
      active: isT1 && !isT2,
      limits: [
        { label: 'P2P Send (per tx)', value: '₦50,000' },
        { label: 'Daily Send Limit', value: '₦200,000' },
        { label: 'Card Daily Limit', value: '₦500' },
        { label: 'Card Monthly Limit', value: '₦5,000' },
        { label: 'Virtual Card', value: 'GOLD (1 card)' },
      ],
    },
    {
      name: 'KYC Level 2 (Premium)',
      color: 'var(--purple)',
      bg: 'rgba(108,92,231,0.08)',
      active: isT2,
      limits: [
        { label: 'P2P Send (per tx)', value: '₦500,000' },
        { label: 'Daily Send Limit', value: '₦2,000,000' },
        { label: 'Card Daily Limit', value: '₦5,000' },
        { label: 'Card Monthly Limit', value: '₦50,000' },
        { label: 'Virtual Card', value: 'PLATINUM (3 cards)' },
      ],
    },
  ];

  return (
    <div className="page" style={{ paddingTop: '16px' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', padding: 0, fontFamily: 'inherit', fontWeight: 700 }}>
        <ChevronLeft size={18} /> Back
      </button>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '4px' }}>Transaction Limits</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Your current tier and what you can do</p>
      </div>

      {/* Current status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'rgba(108,92,231,0.07)', borderRadius: '16px', border: '1px solid rgba(108,92,231,0.2)', marginBottom: '20px' }}>
        <Shield size={20} color="var(--purple)" />
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700 }}>Current Tier</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {tier === 'TIER_2' ? 'KYC Level 2 — Premium' : tier === 'TIER_1' ? 'KYC Level 1 — Verified' : 'Basic — Complete KYC to unlock higher limits'}
          </p>
        </div>
      </div>

      {tiers.map(t => (
        <div key={t.name} style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '12px', boxShadow: 'var(--shadow-sm)', border: t.active ? `1.5px solid ${t.color}` : '1.5px solid transparent', opacity: t.active || !isT1 ? 1 : 0.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.color }} />
              <p style={{ fontSize: '14px', fontWeight: 800 }}>{t.name}</p>
            </div>
            {t.active && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: t.color, background: t.bg, padding: '3px 10px', borderRadius: '20px' }}>
                <CheckCircle size={11} /> Current
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {t.limits.map(l => (
              <div key={l.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{l.label}</p>
                <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>{l.value}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-hint)', marginTop: '8px' }}>
        Complete KYC verification to increase your limits
      </p>
    </div>
  );
}

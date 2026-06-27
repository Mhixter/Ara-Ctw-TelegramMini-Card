import React, { useState } from 'react';
import { Shield, Lock, Key, Eye, EyeOff, CheckCircle, AlertCircle, ChevronLeft, RefreshCw } from 'lucide-react';
import { User } from '../../hooks/useAuth';

interface Props { user: User; onBack: () => void; }

export default function SecurityPage({ user, onBack }: Props) {
  const [showToken, setShowToken] = useState(false);
  const token = localStorage.getItem('token') || '';
  const maskedToken = token.slice(0, 12) + '•'.repeat(20) + token.slice(-8);

  const features = [
    { icon: Lock, label: 'AES-256-GCM Encryption', desc: 'BVN, NIN and card tokens encrypted at rest before database storage.', active: true },
    { icon: Shield, label: 'HMAC-SHA256 Auth', desc: 'Telegram initData verified server-side using your bot token as cryptographic salt.', active: true },
    { icon: Key, label: 'JWT Session Tokens', desc: 'Short-lived 24-hour JWT tokens. Auto-revoked on logout.', active: true },
    { icon: CheckCircle, label: 'Double-Entry Ledger', desc: 'Every naira movement is recorded as a debit/credit pair. No balance can change without a matching entry.', active: true },
    { icon: Shield, label: 'Row-Level Locking', desc: 'SELECT FOR UPDATE prevents double-spend race conditions during concurrent transactions.', active: true },
    { icon: AlertCircle, label: 'Idempotent Webhooks', desc: 'Incoming funding webhooks are deduplicated by reference ID — no double-crediting possible.', active: true },
  ];

  return (
    <div className="page" style={{ paddingTop: '16px' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
        <ChevronLeft size={18} /> Back
      </button>

      <div style={{ marginBottom: '28px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
          <Shield size={26} color="var(--success)" />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Security & Privacy</h1>
        <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>Banking-grade protection on every layer</p>
      </div>

      {/* Session info */}
      <div className="glass" style={{ padding: '18px', marginBottom: '20px', borderColor: 'rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--success)', letterSpacing: '0.5px' }}>ACTIVE SESSION</p>
          <span className="badge badge-success">Secure</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          {[
            { label: 'User ID', value: user.id.slice(0, 8) + '...' },
            { label: 'KYC Level', value: user.kycStatus },
            { label: 'Account', value: user.isActive ? 'Active' : 'Inactive' },
            { label: 'Token TTL', value: '24 hours' },
          ].map(item => (
            <div key={item.label}>
              <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', marginBottom: '2px' }}>{item.label}</p>
              <p style={{ fontSize: '12px', fontWeight: 600 }}>{item.value}</p>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <p style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--tg-theme-hint-color)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {showToken ? token.slice(0, 60) + '...' : maskedToken}
          </p>
          <button onClick={() => setShowToken(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tg-theme-hint-color)', padding: '2px', flexShrink: 0 }}>
            {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Security features */}
      <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tg-theme-hint-color)', letterSpacing: '0.5px', marginBottom: '12px' }}>SECURITY FEATURES</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        {features.map(f => {
          const Icon = f.icon;
          return (
            <div key={f.label} className="glass" style={{ padding: '14px 16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color="var(--success)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700 }}>{f.label}</p>
                  <CheckCircle size={14} color="var(--success)" />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Privacy note */}
      <div className="glass" style={{ padding: '16px', background: 'rgba(108,99,255,0.06)', borderColor: 'rgba(108,99,255,0.2)' }}>
        <p style={{ fontSize: '12px', lineHeight: 1.7, color: 'var(--tg-theme-hint-color)' }}>
          <strong style={{ color: 'var(--tg-theme-text-color)' }}>Your data stays yours.</strong> BoorderPay never stores raw identity numbers. BVN and NIN are hashed with SHA-256 before leaving your device context. Card credentials are encrypted with AES-256-GCM. We do not sell or share your data with third parties.
        </p>
      </div>
    </div>
  );
}

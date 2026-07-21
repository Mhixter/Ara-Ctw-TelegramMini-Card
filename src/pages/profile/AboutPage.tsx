import React from 'react';
import { ChevronLeft, Shield, Zap, Globe, CreditCard, Send, Lock } from 'lucide-react';

interface Props { onBack: () => void; }

const features = [
  { icon: Send,       color: '#6C5CE7', label: 'Instant P2P Transfers',    desc: 'Send NGN to any BorderPay user by Telegram username — no bank details needed.' },
  { icon: CreditCard, color: '#22C55E', label: 'Virtual Cards',            desc: 'Issue Visa/Mastercard virtual cards for online shopping worldwide.' },
  { icon: Globe,      color: '#F4B400', label: 'Virtual Bank Account',     desc: 'Get a dedicated NGN account number for receiving payments from any bank.' },
  { icon: Shield,     color: '#8B5CF6', label: 'Bank-Grade Security',      desc: 'AES-256 encryption, HMAC-SHA256 auth, and a double-entry ledger.' },
  { icon: Zap,        color: '#EF4444', label: 'Telegram-Native',          desc: 'Built as a Telegram Mini App — no separate app install required.' },
  { icon: Lock,       color: '#7474A0', label: 'Regulated & Compliant',    desc: 'CBN-compliant KYC/AML with Tier 1 and Tier 2 verification.' },
];

export default function AboutPage({ onBack }: Props) {
  return (
    <div className="page" style={{ paddingTop: '16px', paddingBottom: '40px' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', padding: 0, fontFamily: 'inherit', fontWeight: 700 }}>
        <ChevronLeft size={18} /> Back
      </button>

      {/* Logo block */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '22px',
          background: 'linear-gradient(135deg, #6C5CE7, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', fontWeight: 900, color: '#fff',
          boxShadow: '0 10px 30px rgba(108,92,231,0.4)', margin: '0 auto 14px',
        }}>B</div>
        <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '4px' }}>BorderPay</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cross-Border NGN Payments · v1.0.0</p>
        <p style={{ fontSize: '12px', color: 'var(--text-hint)', marginTop: '4px' }}>Powered by Ara Tech</p>
      </div>

      {/* Mission */}
      <div style={{ background: 'linear-gradient(135deg, #6C5CE7, #8B5CF6)', borderRadius: '20px', padding: '20px', marginBottom: '20px', color: '#fff', boxShadow: '0 8px 24px rgba(108,92,231,0.35)' }}>
        <p style={{ fontSize: '14px', fontWeight: 800, marginBottom: '6px' }}>Our Mission</p>
        <p style={{ fontSize: '13px', opacity: 0.9, lineHeight: 1.6 }}>
          BorderPay makes cross-border NGN payments instant, secure, and accessible to every Nigerian — directly inside Telegram.
        </p>
      </div>

      {/* Features */}
      <p style={{ fontSize: '14px', fontWeight: 800, marginBottom: '14px' }}>What BorderPay offers</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {features.map(f => {
          const Icon = f.icon;
          return (
            <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', background: 'var(--surface)', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={f.color} />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 800, marginBottom: '3px' }}>{f.label}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tech stack */}
      <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ fontSize: '13px', fontWeight: 800, marginBottom: '10px' }}>Built with</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {['React 19', 'Vite 8', 'TypeScript', 'Express 5', 'PostgreSQL', 'TanStack Query', 'Sudo Africa', 'PayPoint', 'Telegram API'].map(t => (
            <span key={t} style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: 'var(--surface-2)', color: 'var(--text-muted)' }}>{t}</span>
          ))}
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-hint)', marginTop: '24px' }}>
        © 2026 Ara Tech · All rights reserved
      </p>
    </div>
  );
}

import React, { useState } from 'react';
import { HelpCircle, ChevronLeft, ChevronDown, ChevronUp, MessageCircle, Mail, ExternalLink } from 'lucide-react';

interface Props { onBack: () => void; }

const faqs = [
  {
    q: 'How do I fund my NGN wallet?',
    a: 'After completing Tier 1 KYC, a dedicated virtual bank account (Wema, Sterling, or Moniepoint) is assigned to your wallet. Transfer any amount to that account number and your NGN balance updates automatically — usually within seconds.'
  },
  {
    q: 'Why do I need to verify my identity (KYC)?',
    a: 'Central Bank of Nigeria (CBN) regulations require identity verification before issuing virtual payment cards. Tier 1 (BVN/NIN) unlocks Gold cards with ₦290,000/day limits. Tier 2 (document + liveness) unlocks Platinum with ₦2.9M/day limits.'
  },
  {
    q: 'Is my BVN and NIN safe?',
    a: 'Yes. Your BVN and NIN are converted into an irreversible SHA-256 hash immediately and the original numbers are never stored in our database. Even our engineers cannot retrieve your raw identity numbers.'
  },
  {
    q: 'How long does card issuance take?',
    a: 'Card issuance is instant once your NGN wallet has enough balance (₦5,000 issuance fee). The virtual card is ready for online payments immediately after issuance.'
  },
  {
    q: 'Can I freeze my card if it\'s compromised?',
    a: 'Yes — go to Cards, tap your card, then tap "Freeze". The card is disabled within seconds. Tap "Unfreeze" to restore it. You can also set daily and monthly spending limits at any time.'
  },
  {
    q: 'What networks do virtual cards work on?',
    a: 'NairaVault issues Visa and Mastercard virtual cards denominated in NGN. They work on any online platform that accepts Visa/Mastercard, including Netflix, Spotify, Amazon, and international merchants.'
  },
  {
    q: 'My wallet balance didn\'t update after a transfer.',
    a: 'Bank transfers usually settle within 30 seconds. If it\'s been longer than 5 minutes, tap Refresh on the Home page. If it still hasn\'t updated after 10 minutes, contact support with your transfer receipt and account number.'
  },
  {
    q: 'How do I access the admin console?',
    a: 'Navigate to /admin in the address bar. Admin accounts are created by the Super Admin. Each role has specific permissions — Compliance, Support, and Finance Auditor roles are available.'
  },
];

export default function HelpPage({ onBack }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="page" style={{ paddingTop: '16px' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
        <ChevronLeft size={18} /> Back
      </button>

      <div style={{ marginBottom: '28px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(245,185,66,0.12)', border: '1px solid rgba(245,185,66,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
          <HelpCircle size={26} color="var(--gold)" />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Help & Support</h1>
        <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>Frequently asked questions</p>
      </div>

      {/* FAQ accordion */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
        {faqs.map((faq, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={i} className="glass" style={{ overflow: 'hidden', borderColor: isOpen ? 'rgba(108,99,255,0.3)' : 'var(--glass-border)', transition: 'border-color 0.2s' }}>
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'white', textAlign: 'left' }}
              >
                <p style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{faq.q}</p>
                {isOpen ? <ChevronUp size={16} color="var(--accent)" style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color="var(--tg-theme-hint-color)" style={{ flexShrink: 0 }} />}
              </button>
              {isOpen && (
                <div style={{ padding: '0 16px 16px' }}>
                  <div style={{ height: '1px', background: 'var(--glass-border)', marginBottom: '14px' }} />
                  <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', lineHeight: 1.7 }}>{faq.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Contact options */}
      <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tg-theme-hint-color)', letterSpacing: '0.5px', marginBottom: '12px' }}>CONTACT SUPPORT</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { icon: MessageCircle, color: '#229ed9', label: 'Telegram Support', desc: 'Chat with us @NairaVaultSupport', action: () => {} },
          { icon: Mail, color: 'var(--accent)', label: 'Email Support', desc: 'support@nairavault.io · 24h response', action: () => {} },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', cursor: 'pointer', color: 'white', textAlign: 'left' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color={item.color} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{item.label}</p>
                <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>{item.desc}</p>
              </div>
              <ExternalLink size={14} color="var(--tg-theme-hint-color)" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

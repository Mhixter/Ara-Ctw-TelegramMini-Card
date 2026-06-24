import React from 'react';
import { FileText, ChevronLeft } from 'lucide-react';

interface Props { onBack: () => void; }

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using NairaVault (the "Platform"), you agree to be bound by these Terms of Service and all applicable laws and regulations of the Federal Republic of Nigeria. If you do not agree, you may not use the Platform.'
  },
  {
    title: '2. Eligibility',
    body: 'You must be at least 18 years old and a resident of Nigeria with a valid Bank Verification Number (BVN) and/or National Identification Number (NIN) to access full Platform features. Use of the Platform by individuals on any financial sanctions list is strictly prohibited.'
  },
  {
    title: '3. Identity Verification (KYC)',
    body: 'To issue virtual payment cards, you must complete identity verification as mandated by the Central Bank of Nigeria (CBN). You agree to provide accurate, complete, and up-to-date information. False information may result in immediate account suspension and reporting to relevant authorities.'
  },
  {
    title: '4. Virtual Cards',
    body: 'Virtual cards issued through NairaVault are for lawful online purchases only. Cards may not be used for gambling, adult content platforms, illegal goods or services, or circumventing foreign exchange controls. Spending limits are set by KYC tier and may be adjusted by the Platform at any time.'
  },
  {
    title: '5. Wallet Funding',
    body: 'Funds deposited to your virtual NGN wallet are held in trust. NairaVault does not pay interest on wallet balances. You may withdraw available balances (excluding reserved amounts) subject to applicable processing times. The Platform reserves the right to hold funds pending AML/fraud review.'
  },
  {
    title: '6. Fees',
    body: 'A one-time card issuance fee of ₦5,000 is charged per card. Additional fees for specific services will be disclosed before the transaction is processed. All fees are non-refundable unless otherwise stated. Fee schedules are subject to change with 7 days notice.'
  },
  {
    title: '7. Security Responsibilities',
    body: 'You are responsible for maintaining the confidentiality of your Telegram account, which serves as your authentication credential. You must notify us immediately of any unauthorized use. NairaVault is not liable for losses resulting from your failure to secure your Telegram account.'
  },
  {
    title: '8. Data Privacy',
    body: 'We collect and process personal data in accordance with the Nigeria Data Protection Regulation (NDPR). Identity data (BVN/NIN) is stored only as cryptographic hashes. Card credentials are encrypted with AES-256-GCM. We do not sell personal data to third parties. You have the right to request deletion of your data at any time.'
  },
  {
    title: '9. Prohibited Activities',
    body: 'Users may not: attempt to reverse-engineer the Platform; exploit security vulnerabilities; conduct money laundering or terrorist financing; create multiple accounts; impersonate other users; or use automated tools to abuse the Platform.'
  },
  {
    title: '10. Limitation of Liability',
    body: 'NairaVault\'s total liability for any claim shall not exceed the total fees paid by you in the 30 days preceding the claim. We are not liable for losses arising from third-party payment processor downtime, force majeure events, or your own negligence.'
  },
  {
    title: '11. Governing Law',
    body: 'These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes shall be resolved by arbitration under the Arbitration and Conciliation Act (Cap A18), with proceedings conducted in Lagos, Nigeria.'
  },
  {
    title: '12. Changes to Terms',
    body: 'We may update these Terms at any time. Continued use of the Platform after notice of changes constitutes acceptance. We will provide at least 7 days notice of material changes via Telegram bot message.'
  },
];

export default function TermsPage({ onBack }: Props) {
  return (
    <div className="page" style={{ paddingTop: '16px' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
        <ChevronLeft size={18} /> Back
      </button>

      <div style={{ marginBottom: '28px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(168,178,200,0.12)', border: '1px solid rgba(168,178,200,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
          <FileText size={26} color="var(--platinum)" />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Terms of Service</h1>
        <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>Last updated: June 2026 · Nigeria jurisdiction</p>
      </div>

      {/* Intro */}
      <div className="glass" style={{ padding: '16px', marginBottom: '20px', background: 'rgba(245,185,66,0.06)', borderColor: 'rgba(245,185,66,0.2)' }}>
        <p style={{ fontSize: '12px', color: 'var(--warning)', lineHeight: 1.6 }}>
          ⚠️ Please read these terms carefully before using NairaVault. By using the Platform, you accept all the terms below in full.
        </p>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {sections.map(section => (
          <div key={section.title} className="glass" style={{ padding: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', marginBottom: '8px' }}>{section.title}</p>
            <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', lineHeight: 1.8 }}>{section.body}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingBottom: '8px' }}>
        <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', lineHeight: 1.6 }}>
          NairaVault Financial Services Ltd.<br />
          RC Number: 0000001 · Lagos, Nigeria<br />
          Licensed by the Central Bank of Nigeria
        </p>
      </div>
    </div>
  );
}

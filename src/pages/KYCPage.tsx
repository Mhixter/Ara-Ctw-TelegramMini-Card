import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, CheckCircle, ChevronRight, Upload, AlertCircle } from 'lucide-react';
import { kycApi } from '../lib/api';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';

interface Props { user: User; onKycUpdated: (status: string) => void; }

export default function KYCPage({ user, onKycUpdated }: Props) {
  const { haptic } = useTelegram();
  const qc = useQueryClient();
  const [step, setStep] = useState<'overview' | 'tier1' | 'tier2'>('overview');
  const [form1, setForm1] = useState({ bvn: '', nin: '', fullName: '', dateOfBirth: '' });
  const [form2, setForm2] = useState({ documentUrl: '', livenessScore: '85' });

  const { data: kycData } = useQuery({ queryKey: ['kyc-status'], queryFn: kycApi.status });

  const tier1Mutation = useMutation({
    mutationFn: () => kycApi.tier1(form1),
    onSuccess: (data) => {
      haptic('success');
      onKycUpdated(data.kycStatus);
      qc.invalidateQueries({ queryKey: ['kyc-status'] });
      qc.invalidateQueries({ queryKey: ['wallets'] });
      setStep('overview');
    }
  });

  const tier2Mutation = useMutation({
    mutationFn: () => kycApi.tier2({ documentUrl: form2.documentUrl, livenessScore: parseFloat(form2.livenessScore) }),
    onSuccess: (data) => {
      haptic('success');
      onKycUpdated(data.kycStatus);
      qc.invalidateQueries({ queryKey: ['kyc-status'] });
      setStep('overview');
    }
  });

  if (step === 'tier1') {
    return (
      <div className="page" style={{ paddingTop: '20px' }}>
        <button onClick={() => setStep('overview')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
          ← Back
        </button>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Identity Verification</h1>
          <p style={{ fontSize: '14px', color: 'var(--tg-theme-hint-color)' }}>Tier 1 · Gold Card Unlocked ($500/day)</p>
        </div>

        {[
          { key: 'fullName', label: 'Full Legal Name', placeholder: 'John Doe', type: 'text' },
          { key: 'bvn', label: 'Bank Verification Number (BVN)', placeholder: '12345678901', type: 'tel' },
          { key: 'nin', label: 'National ID Number (NIN)', placeholder: '12345678901', type: 'tel' },
          { key: 'dateOfBirth', label: 'Date of Birth', placeholder: '', type: 'date' }
        ].map(field => (
          <div key={field.key} style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
              {field.label}
            </label>
            <input
              className="input-field"
              type={field.type}
              placeholder={field.placeholder}
              value={(form1 as any)[field.key]}
              onChange={e => setForm1(f => ({ ...f, [field.key]: e.target.value }))}
              maxLength={field.key === 'bvn' || field.key === 'nin' ? 11 : undefined}
            />
          </div>
        ))}

        <div className="glass" style={{ padding: '14px', marginBottom: '20px', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)' }}>
          <p style={{ fontSize: '12px', color: 'var(--warning)' }}>
            🔒 Your BVN and NIN are hashed with AES-256 before storage. We never store raw identity numbers.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => tier1Mutation.mutate()}
          disabled={!form1.bvn || !form1.nin || !form1.fullName || !form1.dateOfBirth || tier1Mutation.isPending}
        >
          {tier1Mutation.isPending ? 'Verifying...' : 'Submit for Verification'}
        </button>

        {tier1Mutation.isError && (
          <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>
            {(tier1Mutation.error as any)?.response?.data?.error || 'Verification failed. Try again.'}
          </p>
        )}
      </div>
    );
  }

  if (step === 'tier2') {
    return (
      <div className="page" style={{ paddingTop: '20px' }}>
        <button onClick={() => setStep('overview')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
          ← Back
        </button>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Advanced Verification</h1>
          <p style={{ fontSize: '14px', color: 'var(--tg-theme-hint-color)' }}>Tier 2 · Platinum Card Unlocked ($5,000/day)</p>
        </div>

        <div className="glass" style={{ padding: '20px', marginBottom: '20px', textAlign: 'center', borderStyle: 'dashed' }}>
          <Upload size={32} style={{ color: 'var(--tg-theme-hint-color)', margin: '0 auto 10px' }} />
          <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Upload Government ID</p>
          <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>International Passport, Driver's License, or Voter's Card</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
            Document URL (Smile ID reference)
          </label>
          <input className="input-field" type="text" placeholder="https://..." value={form2.documentUrl} onChange={e => setForm2(f => ({ ...f, documentUrl: e.target.value }))} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
            Liveness Score (Smile ID result: 0–100)
          </label>
          <input className="input-field" type="number" min="0" max="100" placeholder="85" value={form2.livenessScore} onChange={e => setForm2(f => ({ ...f, livenessScore: e.target.value }))} />
        </div>

        <button
          className="btn-gold"
          onClick={() => tier2Mutation.mutate()}
          disabled={!form2.documentUrl || tier2Mutation.isPending}
        >
          {tier2Mutation.isPending ? 'Upgrading...' : 'Unlock Platinum Tier'}
        </button>

        {tier2Mutation.isError && (
          <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>
            {(tier2Mutation.error as any)?.response?.data?.error || 'Upgrade failed. Try again.'}
          </p>
        )}
      </div>
    );
  }

  // Overview
  const tiers = [
    {
      id: 'tier1', label: 'Tier 1 · Gold', desc: 'BVN/NIN Verification', limit: '$500/day · $5,000/month',
      done: user.kycStatus === 'TIER_1' || user.kycStatus === 'TIER_2',
      locked: false, color: 'var(--gold)'
    },
    {
      id: 'tier2', label: 'Tier 2 · Platinum', desc: 'Document + Liveness', limit: '$5,000/day · $50,000/month',
      done: user.kycStatus === 'TIER_2',
      locked: user.kycStatus === 'PENDING', color: 'var(--platinum)'
    }
  ];

  return (
    <div className="page" style={{ paddingTop: '20px' }}>
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>Identity Verification</p>
        <h1 style={{ fontSize: '22px', fontWeight: 800 }}>KYC Levels</h1>
      </div>

      {/* Current Status */}
      <div className="glass" style={{
        padding: '20px', marginBottom: '24px', textAlign: 'center',
        borderColor: user.kycStatus === 'TIER_2' ? 'rgba(168,178,200,0.3)' : user.kycStatus === 'TIER_1' ? 'rgba(245,185,66,0.3)' : 'rgba(245,158,11,0.3)',
        background: user.kycStatus === 'TIER_2' ? 'rgba(168,178,200,0.06)' : user.kycStatus === 'TIER_1' ? 'rgba(245,185,66,0.06)' : 'rgba(245,158,11,0.06)'
      }}>
        <Shield size={36} style={{ margin: '0 auto 10px', color: user.kycStatus === 'TIER_2' ? 'var(--platinum)' : user.kycStatus === 'TIER_1' ? 'var(--gold)' : 'var(--warning)' }} />
        <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
          {user.kycStatus === 'PENDING' ? 'Unverified' : user.kycStatus === 'TIER_1' ? 'Gold Verified' : user.kycStatus === 'TIER_2' ? 'Platinum Verified' : 'Account Banned'}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>
          {kycData?.kyc?.full_name || 'Complete verification to unlock cards'}
        </p>
      </div>

      {/* Tiers */}
      {tiers.map(tier => (
        <div key={tier.id} className="glass" style={{
          marginBottom: '12px', padding: '18px 16px',
          borderColor: tier.done ? `${tier.color}40` : 'var(--glass-border)',
          background: tier.done ? `${tier.color}08` : 'var(--glass-bg)',
          opacity: tier.locked ? 0.5 : 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
              background: tier.done ? `${tier.color}20` : 'rgba(255,255,255,0.06)',
              border: `2px solid ${tier.done ? tier.color : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {tier.done ? <CheckCircle size={22} color={tier.color} /> : <Shield size={22} color={tier.locked ? 'var(--tg-theme-hint-color)' : tier.color} strokeWidth={1.5} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px', color: tier.done ? tier.color : 'var(--tg-theme-text-color)' }}>{tier.label}</p>
              <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>{tier.desc}</p>
              <p style={{ fontSize: '11px', fontWeight: 600, color: tier.color, marginTop: '4px' }}>{tier.limit}</p>
            </div>
            {!tier.done && !tier.locked && (
              <button
                onClick={() => setStep(tier.id as 'tier1' | 'tier2')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: tier.color, padding: '8px' }}
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Info */}
      <div className="glass" style={{ padding: '16px', marginTop: '8px', background: 'rgba(108,99,255,0.06)', borderColor: 'rgba(108,99,255,0.2)' }}>
        <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', lineHeight: 1.6 }}>
          🔐 <strong>Powered by Smile ID.</strong> Your identity data is encrypted with AES-256-GCM. BVN/NIN are stored only as irreversible hashes — we can never view your raw identity numbers.
        </p>
      </div>
    </div>
  );
}

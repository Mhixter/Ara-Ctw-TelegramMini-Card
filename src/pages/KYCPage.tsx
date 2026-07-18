import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, CheckCircle, ChevronRight, Upload, Clock, AlertCircle, Globe } from 'lucide-react';
import { kycApi } from '../lib/api';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';

interface Props { user: User; onKycUpdated: (status: string) => void; }

const COUNTRIES = [
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'UG', name: 'Uganda' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'CM', name: 'Cameroon' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'AE', name: 'UAE' },
  { code: 'IN', name: 'India' },
  { code: 'OTHER', name: 'Other country' },
];

const ID_TYPES_BY_COUNTRY: Record<string, { value: string; label: string }[]> = {
  NG: [
    { value: 'BVN_NIN', label: 'BVN + NIN (Recommended)' },
    { value: 'PASSPORT', label: 'International Passport' },
    { value: 'NATIONAL_ID', label: 'National ID Card' },
    { value: 'DRIVERS_LICENSE', label: "Driver's License" },
  ],
  DEFAULT: [
    { value: 'PASSPORT', label: 'International Passport' },
    { value: 'NATIONAL_ID', label: 'National ID Card / NIN' },
    { value: 'DRIVERS_LICENSE', label: "Driver's License" },
    { value: 'VOTERS_CARD', label: "Voter's Card / Registration" },
  ],
};

function getIdTypes(country: string) {
  return ID_TYPES_BY_COUNTRY[country] || ID_TYPES_BY_COUNTRY.DEFAULT;
}

function getIdLabel(idType: string) {
  const all = [...ID_TYPES_BY_COUNTRY.NG, ...ID_TYPES_BY_COUNTRY.DEFAULT];
  return all.find(t => t.value === idType)?.label || 'ID Number';
}

export default function KYCPage({ user, onKycUpdated }: Props) {
  const { haptic } = useTelegram();
  const qc = useQueryClient();
  const [step, setStep] = useState<'overview' | 'tier1' | 'tier2'>('overview');

  const [form1, setForm1] = useState({
    fullName: '',
    dateOfBirth: '',
    country: 'NG',
    idType: 'BVN_NIN',
    bvn: '',
    nin: '',
    idNumber: '',
  });
  const [form2, setForm2] = useState({ documentUrl: '', livenessScore: '85' });

  const { data: kycData } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: kycApi.status,
  });

  const tier1Mutation = useMutation({
    mutationFn: () => kycApi.tier1({
      fullName: form1.fullName,
      dateOfBirth: form1.dateOfBirth,
      country: form1.country,
      idType: form1.idType,
      bvn: form1.country === 'NG' && form1.idType === 'BVN_NIN' ? form1.bvn : undefined,
      nin: form1.country === 'NG' && form1.idType === 'BVN_NIN' ? form1.nin : undefined,
      idNumber: form1.country !== 'NG' || form1.idType !== 'BVN_NIN' ? form1.idNumber : undefined,
    }),
    onSuccess: (data) => {
      haptic('success');
      onKycUpdated(data.kycStatus);
      qc.invalidateQueries({ queryKey: ['kyc-status'] });
      qc.invalidateQueries({ queryKey: ['wallets'] });
      setStep('overview');
    },
  });

  const tier2Mutation = useMutation({
    mutationFn: () => kycApi.tier2({
      documentUrl: form2.documentUrl,
      livenessScore: parseFloat(form2.livenessScore),
    }),
    onSuccess: (data) => {
      haptic('success');
      onKycUpdated(data.kycStatus);
      qc.invalidateQueries({ queryKey: ['kyc-status'] });
      setStep('overview');
    },
  });

  const handleCountryChange = (c: string) => {
    const idTypes = getIdTypes(c);
    setForm1(f => ({ ...f, country: c, idType: idTypes[0].value, bvn: '', nin: '', idNumber: '' }));
  };

  const isNigerianBVNNIN = form1.country === 'NG' && form1.idType === 'BVN_NIN';

  const canSubmitTier1 = (() => {
    if (!form1.fullName.trim() || !form1.dateOfBirth) return false;
    if (isNigerianBVNNIN) return !!(form1.bvn.trim() || form1.nin.trim());
    return !!form1.idNumber.trim();
  })();

  if (step === 'tier1') {
    const idTypes = getIdTypes(form1.country);
    return (
      <div className="page" style={{ paddingTop: '20px' }}>
        <button
          onClick={() => setStep('overview')}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}
        >
          ← Back
        </button>
        <div style={{ marginBottom: '22px' }}>
          <p style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 700, marginBottom: '4px' }}>🥇 Tier 1 · Gold</p>
          <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px' }}>Identity Verification</h1>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>Unlock Gold card · $500/day spending limit</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
            Full Legal Name
          </label>
          <input
            className="input-field"
            type="text"
            placeholder="As it appears on your ID"
            value={form1.fullName}
            onChange={e => setForm1(f => ({ ...f, fullName: e.target.value }))}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
            Date of Birth
          </label>
          <input
            className="input-field"
            type="date"
            value={form1.dateOfBirth}
            max={new Date().toISOString().split('T')[0]}
            min="1900-01-01"
            onChange={e => setForm1(f => ({ ...f, dateOfBirth: e.target.value }))}
          />
          {!form1.dateOfBirth && (
            <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginTop: '4px' }}>
              If the picker doesn't open, type in YYYY-MM-DD format (e.g. 1999-11-25)
            </p>
          )}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
            <Globe size={12} /> Country of Residence
          </label>
          <select
            className="input-field"
            value={form1.country}
            onChange={e => handleCountryChange(e.target.value)}
            style={{ appearance: 'none' }}
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
            ID Type
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {idTypes.map(t => (
              <label key={t.value} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                border: '1px solid',
                borderColor: form1.idType === t.value ? 'var(--accent)' : 'var(--glass-border)',
                background: form1.idType === t.value ? 'rgba(108,99,255,0.08)' : 'var(--glass-bg)',
              }}>
                <input
                  type="radio"
                  name="idType"
                  value={t.value}
                  checked={form1.idType === t.value}
                  onChange={() => setForm1(f => ({ ...f, idType: t.value, bvn: '', nin: '', idNumber: '' }))}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {isNigerianBVNNIN ? (
          <>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
                Bank Verification Number (BVN)
              </label>
              <input
                className="input-field"
                type="tel"
                placeholder="11 digits"
                value={form1.bvn}
                maxLength={11}
                onChange={e => setForm1(f => ({ ...f, bvn: e.target.value.replace(/\D/g, '') }))}
              />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
                National ID Number (NIN)
              </label>
              <input
                className="input-field"
                type="tel"
                placeholder="11 digits"
                value={form1.nin}
                maxLength={11}
                onChange={e => setForm1(f => ({ ...f, nin: e.target.value.replace(/\D/g, '') }))}
              />
            </div>
          </>
        ) : (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
              {getIdLabel(form1.idType)} Number
            </label>
            <input
              className="input-field"
              type="text"
              placeholder="Enter your document number"
              value={form1.idNumber}
              onChange={e => setForm1(f => ({ ...f, idNumber: e.target.value }))}
            />
          </div>
        )}

        <div className="glass" style={{ padding: '14px', marginBottom: '20px', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)' }}>
          <p style={{ fontSize: '12px', color: 'var(--warning)', lineHeight: 1.5 }}>
            🔒 Your ID numbers are hashed with SHA-256+salt before storage. We never store raw identity numbers.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => tier1Mutation.mutate()}
          disabled={!canSubmitTier1 || tier1Mutation.isPending}
        >
          {tier1Mutation.isPending ? 'Submitting...' : 'Submit for Verification'}
        </button>

        {tier1Mutation.isError && (
          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px' }}>
            <p style={{ color: 'var(--danger)', fontSize: '13px' }}>
              {(tier1Mutation.error as any)?.response?.data?.error || 'Submission failed. Please try again.'}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (step === 'tier2') {
    return (
      <div className="page" style={{ paddingTop: '20px' }}>
        <button
          onClick={() => setStep('overview')}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
        >
          ← Back
        </button>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Advanced Verification</h1>
          <p style={{ fontSize: '14px', color: 'var(--tg-theme-hint-color)' }}>Tier 2 · Platinum Card ($5,000/day)</p>
        </div>

        <div className="glass" style={{ padding: '20px', marginBottom: '20px', textAlign: 'center', borderStyle: 'dashed' }}>
          <Upload size={32} style={{ color: 'var(--tg-theme-hint-color)', margin: '0 auto 10px' }} />
          <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Upload Government ID</p>
          <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>Passport, Driver's License, or National ID — any country</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
            Document URL (upload to your provider and paste link)
          </label>
          <input
            className="input-field"
            type="text"
            placeholder="https://..."
            value={form2.documentUrl}
            onChange={e => setForm2(f => ({ ...f, documentUrl: e.target.value }))}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
            Liveness Score (0–100, from your ID provider)
          </label>
          <input
            className="input-field"
            type="number"
            min="0"
            max="100"
            placeholder="85"
            value={form2.livenessScore}
            onChange={e => setForm2(f => ({ ...f, livenessScore: e.target.value }))}
          />
        </div>

        <button
          className="btn-gold"
          onClick={() => tier2Mutation.mutate()}
          disabled={!form2.documentUrl || tier2Mutation.isPending}
        >
          {tier2Mutation.isPending ? 'Submitting...' : 'Unlock Platinum Tier'}
        </button>

        {tier2Mutation.isError && (
          <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>
            {(tier2Mutation.error as any)?.response?.data?.error || 'Upgrade failed. Try again.'}
          </p>
        )}
      </div>
    );
  }

  const isPendingReview = user.kycStatus === 'PENDING_REVIEW';
  const rejectionReason = (kycData as any)?.rejectionReason;

  const tiers = [
    {
      id: 'tier1', label: 'Tier 1 · Personal Info', desc: 'Identity Verification (worldwide)',
      limit: '$500/day · $5,000/month',
      done: user.kycStatus === 'TIER_1' || user.kycStatus === 'TIER_2',
      locked: false, color: 'var(--gold)',
      icon: '👤',
    },
    {
      id: 'tier2', label: 'Tier 2 · Document Upload', desc: 'Passport, National ID, Driver License',
      limit: '$5,000/day · $50,000/month',
      done: user.kycStatus === 'TIER_2',
      locked: !['TIER_1', 'TIER_2'].includes(user.kycStatus),
      color: 'var(--platinum)',
      icon: '🪪',
    },
    {
      id: 'tier3', label: 'Tier 3 · Face Liveness', desc: 'AI-powered selfie & biometric check',
      limit: 'Unlimited · Global access',
      done: false,
      locked: true, color: 'var(--accent)',
      icon: '🤳',
    },
    {
      id: 'tier4', label: 'Tier 4 · Address Proof', desc: 'Utility bill or bank statement',
      limit: 'Enterprise limits',
      done: false,
      locked: true, color: 'var(--success)',
      icon: '🏠',
    },
  ];

  // Progress: count completed tiers
  const completedCount = user.kycStatus === 'TIER_2' ? 2 : user.kycStatus === 'TIER_1' ? 1 : 0;
  const progressPct = (completedCount / 4) * 100;

  return (
    <div className="page" style={{ paddingTop: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '2px' }}>Identity Verification</p>
        <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>KYC Levels</h1>
      </div>

      {/* Progress Overview */}
      <div className="glass" style={{
        padding: '20px', marginBottom: '20px',
        borderRadius: '24px',
        borderColor: isPendingReview
          ? 'rgba(108,92,231,0.3)'
          : user.kycStatus === 'TIER_2' ? 'rgba(168,178,200,0.3)'
          : user.kycStatus === 'TIER_1' ? 'rgba(244,180,0,0.3)' : 'rgba(245,158,11,0.2)',
        background: isPendingReview
          ? 'rgba(108,92,231,0.06)'
          : user.kycStatus === 'TIER_2' ? 'rgba(168,178,200,0.06)'
          : user.kycStatus === 'TIER_1' ? 'rgba(244,180,0,0.06)' : 'rgba(245,158,11,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px', flexShrink: 0,
            background: isPendingReview ? 'rgba(108,92,231,0.12)' : user.kycStatus === 'TIER_2' ? 'rgba(168,178,200,0.12)' : user.kycStatus === 'TIER_1' ? 'rgba(244,180,0,0.12)' : 'rgba(245,158,11,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
          }}>
            {isPendingReview ? '⏳' : user.kycStatus === 'TIER_2' ? '🏆' : user.kycStatus === 'TIER_1' ? '🥇' : '🔓'}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: '16px', marginBottom: '3px', letterSpacing: '-0.3px' }}>
              {isPendingReview ? 'Under Review' :
                user.kycStatus === 'PENDING' ? 'Not Verified' :
                user.kycStatus === 'TIER_1' ? 'Gold Verified ✓' :
                user.kycStatus === 'TIER_2' ? 'Platinum Verified ✓' : 'Account Suspended'}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', lineHeight: 1.4 }}>
              {isPendingReview
                ? 'Your documents are being reviewed. Usually within 24 hours.'
                : kycData?.kyc?.full_name
                  ? `Verified as ${kycData.kyc.full_name}`
                  : 'Complete verification to unlock virtual cards'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', fontWeight: 600 }}>Verification Progress</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>{completedCount}/4 tiers</span>
          </div>
          <div style={{ height: '6px', borderRadius: '3px', background: 'var(--glass-border)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '3px',
              background: user.kycStatus === 'TIER_2'
                ? 'linear-gradient(90deg, var(--gold), var(--platinum))'
                : user.kycStatus === 'TIER_1'
                  ? 'linear-gradient(90deg, var(--gold-dark), var(--gold))'
                  : 'linear-gradient(90deg, var(--accent), var(--accent-2))',
              width: `${progressPct}%`,
              transition: 'width 0.8s cubic-bezier(0.2, 0, 0, 1)',
            }} />
          </div>
        </div>
      </div>

      {/* Rejection notice */}
      {rejectionReason && user.kycStatus === 'PENDING' && (
        <div className="glass" style={{ padding: '14px', marginBottom: '16px', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <AlertCircle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--danger)', marginBottom: '4px' }}>Verification Not Approved</p>
              <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', lineHeight: 1.5 }}>{rejectionReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tier Timeline */}
      {!isPendingReview && (
        <div style={{ position: 'relative' }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute', left: '21px', top: '28px', bottom: '28px',
            width: '2px', background: 'var(--glass-border)', borderRadius: '1px',
          }} />

          {tiers.map((tier, index) => (
            <div key={tier.id} style={{ display: 'flex', gap: '14px', marginBottom: '12px', alignItems: 'flex-start' }}>
              {/* Timeline dot */}
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                background: tier.done ? `${tier.color}20` : tier.locked ? 'rgba(255,255,255,0.04)' : `${tier.color}10`,
                border: `2px solid ${tier.done ? tier.color : tier.locked ? 'var(--glass-border)' : tier.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: tier.locked ? '16px' : '18px',
                zIndex: 1, position: 'relative',
                transition: 'all 0.2s',
                opacity: tier.locked ? 0.55 : 1,
              }}>
                {tier.done ? '✓' : tier.locked ? '🔒' : tier.icon}
              </div>

              {/* Tier card */}
              <div
                className="glass"
                style={{
                  flex: 1, padding: '14px 16px',
                  borderColor: tier.done ? `${tier.color}35` : tier.locked ? 'var(--glass-border)' : `${tier.color}25`,
                  background: tier.done ? `${tier.color}06` : 'var(--glass-bg)',
                  opacity: tier.locked ? 0.6 : 1,
                  borderRadius: '18px',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px', color: tier.done ? tier.color : 'var(--tg-theme-text-color)', letterSpacing: '-0.2px' }}>
                      {tier.label}
                      {tier.done && <span style={{ marginLeft: '6px', fontSize: '12px' }}>✓</span>}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginBottom: '5px' }}>{tier.desc}</p>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, color: tier.color,
                      background: `${tier.color}12`, padding: '2px 8px', borderRadius: '8px',
                      border: `1px solid ${tier.color}20`,
                    }}>
                      {tier.limit}
                    </span>
                  </div>
                  {!tier.done && !tier.locked && (
                    <button
                      onClick={() => setStep(tier.id as 'tier1' | 'tier2')}
                      style={{
                        padding: '8px 14px', borderRadius: '10px', border: `1px solid ${tier.color}40`,
                        background: `${tier.color}10`, color: tier.color,
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginLeft: '10px',
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}
                    >
                      Start <ChevronRight size={14} />
                    </button>
                  )}
                  {tier.done && (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `${tier.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '10px' }}>
                      <CheckCircle size={16} color={tier.color} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Encryption notice */}
      <div className="glass" style={{ padding: '14px 16px', marginTop: '8px', background: 'rgba(108,92,231,0.05)', borderColor: 'rgba(108,92,231,0.18)', borderRadius: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>🔐</span>
          <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--tg-theme-text-color)' }}>End-to-end encrypted.</strong> We accept government-issued ID from 180+ countries. Data is encrypted with AES-256-GCM and ID numbers are stored only as irreversible SHA-256 hashes.
          </p>
        </div>
      </div>
    </div>
  );
}

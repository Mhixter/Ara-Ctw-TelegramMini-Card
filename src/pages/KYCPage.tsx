import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, ChevronRight, Upload, Clock, AlertCircle, Globe, ArrowLeft, Shield, Camera } from 'lucide-react';
import { kycApi } from '../lib/api';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';

interface Props { user: User; onKycUpdated: (status: string) => void; }

const COUNTRIES = [
  { code: 'NG', name: 'Nigeria' }, { code: 'GH', name: 'Ghana' },
  { code: 'KE', name: 'Kenya' }, { code: 'ZA', name: 'South Africa' },
  { code: 'UG', name: 'Uganda' }, { code: 'TZ', name: 'Tanzania' },
  { code: 'RW', name: 'Rwanda' }, { code: 'ET', name: 'Ethiopia' },
  { code: 'SN', name: 'Senegal' }, { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' }, { code: 'AE', name: 'UAE' },
  { code: 'OTHER', name: 'Other country' },
];

const ID_TYPES: Record<string, { value: string; label: string }[]> = {
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
  ],
};

function getIdTypes(country: string) { return ID_TYPES[country] || ID_TYPES.DEFAULT; }

type View = 'overview' | 'tier1' | 'tier2';

export default function KYCPage({ user, onKycUpdated }: Props) {
  const { haptic } = useTelegram();
  const qc = useQueryClient();
  const [view, setView] = useState<View>('overview');
  const [docType, setDocType] = useState<'passport' | 'national_id' | 'driver'>('passport');

  const [form1, setForm1] = useState({
    fullName: '', dateOfBirth: '', country: 'NG',
    idType: 'BVN_NIN', bvn: '', nin: '', idNumber: '',
  });
  const [form2, setForm2] = useState({ documentUrl: 'submitted', livenessScore: '85' });

  const { data: kycData } = useQuery({ queryKey: ['kyc-status'], queryFn: kycApi.status });

  const tier1Mutation = useMutation({
    mutationFn: () => kycApi.tier1({
      fullName: form1.fullName, dateOfBirth: form1.dateOfBirth, country: form1.country,
      idType: form1.idType,
      bvn: form1.country === 'NG' && form1.idType === 'BVN_NIN' ? form1.bvn : undefined,
      nin: form1.country === 'NG' && form1.idType === 'BVN_NIN' ? form1.nin : undefined,
      idNumber: form1.country !== 'NG' || form1.idType !== 'BVN_NIN' ? form1.idNumber : undefined,
    }),
    onSuccess: (data) => {
      haptic('success'); onKycUpdated(data.kycStatus);
      qc.invalidateQueries({ queryKey: ['kyc-status'] });
      qc.invalidateQueries({ queryKey: ['wallets'] });
      setView('overview');
    },
  });

  const tier2Mutation = useMutation({
    mutationFn: () => kycApi.tier2({ documentUrl: form2.documentUrl, livenessScore: parseFloat(form2.livenessScore) }),
    onSuccess: (data) => {
      haptic('success'); onKycUpdated(data.kycStatus);
      qc.invalidateQueries({ queryKey: ['kyc-status'] });
      setView('overview');
    },
  });

  const isTier1Done   = user.kycStatus === 'TIER_1' || user.kycStatus === 'TIER_2' || user.kycStatus === 'PENDING_REVIEW';
  const isTier2Done   = user.kycStatus === 'TIER_2';
  const isReview      = user.kycStatus === 'PENDING_REVIEW';
  const isNigerianBVN = form1.country === 'NG' && form1.idType === 'BVN_NIN';

  const canT1 = form1.fullName.trim() && form1.dateOfBirth && (isNigerianBVN ? (form1.bvn.trim() || form1.nin.trim()) : form1.idNumber.trim());

  const progress = user.kycStatus === 'PENDING' ? 10 : user.kycStatus === 'TIER_1' ? 50 : user.kycStatus === 'PENDING_REVIEW' ? 65 : user.kycStatus === 'TIER_2' ? 100 : 10;

  // ── Tier 1 Form ─────────────────────────────────────────────────────────
  if (view === 'tier1') {
    const idTypes = getIdTypes(form1.country);
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '100px' }}>
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <button onClick={() => setView('overview')} className="icon-btn"><ArrowLeft size={18} color="var(--text)" /></button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 900 }}>Identity Verification</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tier 1 · Personal Information</p>
          </div>
        </div>
        <div style={{ padding: '0 20px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
            {[
              { label: 'Full Legal Name', placeholder: 'As it appears on your ID', field: 'fullName', type: 'text' },
              { label: 'Date of Birth', placeholder: 'YYYY-MM-DD', field: 'dateOfBirth', type: 'date' },
            ].map(f => (
              <div key={f.field} style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '8px' }}>{f.label}</label>
                <input className="input-field" type={f.type} placeholder={f.placeholder}
                  value={(form1 as any)[f.field]} max={f.type === 'date' ? new Date().toISOString().split('T')[0] : undefined}
                  onChange={e => setForm1(p => ({ ...p, [f.field]: e.target.value }))} />
              </div>
            ))}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Globe size={14} color="var(--purple)" /> Country of Residence
              </label>
              <select className="input-field" value={form1.country} onChange={e => { const idT = getIdTypes(e.target.value); setForm1(p => ({ ...p, country: e.target.value, idType: idT[0].value, bvn: '', nin: '', idNumber: '' })); }}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '8px' }}>ID Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {idTypes.map(t => (
                  <button key={t.value} onClick={() => setForm1(p => ({ ...p, idType: t.value, bvn: '', nin: '', idNumber: '' }))} style={{
                    padding: '10px', borderRadius: '12px', border: `1.5px solid ${form1.idType === t.value ? 'var(--purple)' : 'var(--border)'}`,
                    background: form1.idType === t.value ? 'rgba(108,92,231,0.08)' : 'var(--surface-2)',
                    color: form1.idType === t.value ? 'var(--purple)' : 'var(--text)', fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}>{t.label}</button>
                ))}
              </div>
            </div>
            {isNigerianBVN ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '8px' }}>BVN (Bank Verification Number)</label>
                  <input className="input-field" placeholder="11-digit BVN" maxLength={11} value={form1.bvn} onChange={e => setForm1(p => ({ ...p, bvn: e.target.value }))} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '8px' }}>NIN (National Identity Number)</label>
                  <input className="input-field" placeholder="11-digit NIN" maxLength={11} value={form1.nin} onChange={e => setForm1(p => ({ ...p, nin: e.target.value }))} />
                </div>
              </>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '8px' }}>ID Number</label>
                <input className="input-field" placeholder="Enter your ID number" value={form1.idNumber} onChange={e => setForm1(p => ({ ...p, idNumber: e.target.value }))} />
              </div>
            )}
          </div>

          {tier1Mutation.isError && (
            <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 600 }}>
                {(tier1Mutation.error as any)?.response?.data?.error || 'Verification failed. Check your details and try again.'}
              </p>
            </div>
          )}
          <button className="btn-primary" onClick={() => tier1Mutation.mutate()} disabled={!canT1 || tier1Mutation.isPending}>
            {tier1Mutation.isPending ? (<><span className="spinner" style={{ width: 16, height: 16 }} /> Submitting…</>) : 'Submit Tier 1 Verification'}
          </button>
        </div>
      </div>
    );
  }

  // ── Tier 2 Form ─────────────────────────────────────────────────────────
  if (view === 'tier2') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '100px' }}>
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <button onClick={() => setView('overview')} className="icon-btn"><ArrowLeft size={18} color="var(--text)" /></button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 900 }}>Government ID Upload</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tier 2 · Upload a valid government-issued ID</p>
          </div>
        </div>
        <div style={{ padding: '0 20px' }}>
          {/* Select ID type */}
          <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontSize: '14px', fontWeight: 800, marginBottom: '14px' }}>Select ID Type</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { id: 'passport', label: 'Passport', desc: 'Photo page', emoji: '🛂' },
                { id: 'national_id', label: 'National ID', desc: 'Front & back', emoji: '🪪' },
                { id: 'driver', label: 'Driver License', desc: 'Front & back', emoji: '🚗' },
              ].map(t => (
                <button key={t.id} onClick={() => setDocType(t.id as any)} style={{
                  padding: '12px 8px', borderRadius: '14px', cursor: 'pointer',
                  border: `1.5px solid ${docType === t.id ? 'var(--purple)' : 'var(--border)'}`,
                  background: docType === t.id ? 'rgba(108,92,231,0.08)' : 'var(--surface-2)',
                  fontFamily: 'inherit', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>{t.emoji}</div>
                  <p style={{ fontSize: '12px', fontWeight: 800, color: docType === t.id ? 'var(--purple)' : 'var(--text)', marginBottom: '2px' }}>{t.label}</p>
                  <p style={{ fontSize: '10px', color: 'var(--text-hint)' }}>{t.desc}</p>
                </button>
              ))}
            </div>

            {/* Upload area */}
            <div style={{
              border: '2px dashed var(--border)', borderRadius: '16px', padding: '32px 20px',
              textAlign: 'center', background: 'var(--surface-2)', cursor: 'pointer',
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(108,92,231,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Upload size={22} color="var(--purple)" />
              </div>
              <p style={{ fontWeight: 700, marginBottom: '4px' }}>Drag &amp; drop your file here</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>or click to <span style={{ color: 'var(--purple)', fontWeight: 700 }}>browse</span></p>
              <p style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: '8px' }}>JPG, PNG, PDF up to 10MB</p>
            </div>
          </div>

          {/* Liveness check */}
          <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(108,92,231,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Camera size={22} color="var(--purple)" />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 800 }}>Face Liveness Check</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Verify your identity with a quick selfie</p>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, color: 'var(--warning)', background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: '20px' }}>Pending</span>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--surface-2)', fontSize: '13px', color: 'var(--text-muted)' }}>
              📸 We'll verify you're a real person using camera liveness detection
            </div>
          </div>

          {tier2Mutation.isError && (
            <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 600 }}>
                {(tier2Mutation.error as any)?.response?.data?.error || 'Verification failed. Try again.'}
              </p>
            </div>
          )}
          <button className="btn-primary" onClick={() => tier2Mutation.mutate()} disabled={tier2Mutation.isPending}>
            {tier2Mutation.isPending ? (<><span className="spinner" style={{ width: 16, height: 16 }} /> Submitting…</>) : 'Submit for Review'}
          </button>
        </div>
      </div>
    );
  }

  // ── Overview ─────────────────────────────────────────────────────────────
  const tiers = [
    {
      num: 1, label: 'Tier 1', title: 'Personal Information',
      desc: 'Provide your basic personal details', status: isTier1Done ? 'done' : 'active',
      sub: isTier1Done ? 'Information Submitted' : 'Full name, date of birth, nationality, and more',
      action: !isTier1Done ? () => setView('tier1') : null,
    },
    {
      num: 2, label: 'Tier 2', title: 'Government ID Upload',
      desc: 'Upload a valid government-issued ID', status: isTier2Done ? 'done' : isTier1Done ? 'active' : 'pending',
      sub: isTier2Done ? 'Document Verified' : isReview ? 'Under Review' : 'Passport, National ID or Driver License',
      action: isTier1Done && !isTier2Done && !isReview ? () => setView('tier2') : null,
    },
    {
      num: 3, label: 'Tier 3', title: 'Face Liveness Check',
      desc: 'Verify your identity with a quick selfie', status: isTier2Done ? 'done' : 'pending',
      sub: 'Liveness detection — We\'ll verify you\'re a real person', action: null,
    },
    {
      num: 4, label: 'Tier 4', title: 'Address Verification',
      desc: 'Confirm your residential address', status: isTier2Done ? 'done' : 'pending',
      sub: 'Proof of address — Utility bill, bank statement, or government document', action: null,
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 900 }}>Identity Verification</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Complete verification to unlock all BorderPay features</p>
        </div>
        <button className="icon-btn">
          <AlertCircle size={18} color="var(--text-muted)" />
        </button>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* Progress card */}
        <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(108,92,231,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={24} color="var(--purple)" />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 800 }}>Verification Progress</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {user.kycStatus === 'TIER_2' ? 'Fully verified!' : `${progress}% complete`}
                </p>
              </div>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 900, color: 'var(--purple)' }}>{progress}%</span>
          </div>
          {/* Progress bar */}
          <div style={{ height: '8px', borderRadius: '4px', background: 'var(--surface-2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '4px', width: `${progress}%`, background: 'linear-gradient(90deg, var(--purple), #8B5CF6)', transition: 'width 0.6s ease' }} />
          </div>
          {progress < 100 && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>You're almost there! Complete the remaining steps to get fully verified.</p>}

          {/* Security guarantee */}
          <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle size={16} color="var(--emerald)" />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--emerald)' }}>Security Guaranteed</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Your data is encrypted and securely protected at every step.</p>
            </div>
          </div>
        </div>

        {/* Tier timeline */}
        <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
          {tiers.map((tier, i) => {
            const isDone    = tier.status === 'done';
            const isActive  = tier.status === 'active';
            const isPending = tier.status === 'pending';
            return (
              <div key={tier.num} style={{ display: 'flex', gap: '16px', paddingBottom: i < tiers.length - 1 ? '20px' : 0 }}>
                {/* Number + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDone ? 'var(--emerald)' : isActive ? 'var(--purple)' : 'var(--surface-2)',
                    border: `2px solid ${isDone ? 'var(--emerald)' : isActive ? 'var(--purple)' : 'var(--border)'}`,
                    color: isDone || isActive ? '#fff' : 'var(--text-hint)',
                    fontSize: '13px', fontWeight: 900,
                  }}>
                    {isDone ? <CheckCircle size={16} /> : tier.num}
                  </div>
                  {i < tiers.length - 1 && (
                    <div style={{ width: '2px', flex: 1, minHeight: '24px', background: isDone ? 'var(--emerald)' : 'var(--border)', marginTop: '4px', borderRadius: '1px' }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ flex: 1, paddingTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: isActive ? 'var(--purple)' : isDone ? 'var(--emerald)' : 'var(--text-hint)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{tier.label}</span>
                      <p style={{ fontSize: '14px', fontWeight: 800, color: isPending ? 'var(--text-hint)' : 'var(--text)', marginTop: '2px' }}>{tier.title}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tier.desc}</p>
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', flexShrink: 0, marginLeft: '8px',
                      background: isDone ? 'rgba(34,197,94,0.1)' : isActive ? 'rgba(108,92,231,0.1)' : 'var(--surface-2)',
                      color: isDone ? 'var(--emerald)' : isActive ? 'var(--purple)' : 'var(--text-hint)',
                    }}>
                      {isDone ? '✓ Completed' : isActive ? (isReview && tier.num === 2 ? '⏳ Under Review' : '● In Progress') : 'Pending'}
                    </span>
                  </div>
                  {/* Sub-card */}
                  {(isDone || isActive) && (
                    <div
                      onClick={() => tier.action?.()}
                      style={{
                        padding: '10px 14px', borderRadius: '12px',
                        background: isDone ? 'rgba(34,197,94,0.05)' : 'var(--surface-2)',
                        border: `1px solid ${isDone ? 'rgba(34,197,94,0.15)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: tier.action ? 'pointer' : 'default',
                        marginBottom: i < tiers.length - 1 ? 0 : 0,
                      }}
                    >
                      <p style={{ fontSize: '12px', color: isDone ? 'var(--emerald)' : 'var(--text-muted)', fontWeight: 600 }}>{tier.sub}</p>
                      {tier.action && <ChevronRight size={14} color="var(--text-hint)" />}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Verification benefits */}
        <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
          <p style={{ fontSize: '14px', fontWeight: 800, marginBottom: '14px' }}>Verification Benefits</p>
          {[
            'Higher transaction limits', 'Access to all features',
            'Add multiple cards', 'Priority customer support', 'Enhanced account security',
          ].map(b => (
            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(108,92,231,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={12} color="var(--purple)" />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text)' }}>{b}</span>
            </div>
          ))}
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '12px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Estimated Time: 5-10 minutes to complete all steps</span>
          </div>
        </div>
      </div>
    </div>
  );
}

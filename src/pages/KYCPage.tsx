import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, ChevronRight, Clock, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { kycApi } from '../lib/api';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';

interface Props { user: User; onKycUpdated: (status: string) => void; }

type View = 'overview' | 'verify';

export default function KYCPage({ user, onKycUpdated }: Props) {
  const { haptic } = useTelegram();
  const qc = useQueryClient();
  const [view, setView] = useState<View>('overview');

  const [form, setForm] = useState({ bvn: '', phone: '' });

  const { data: kycData } = useQuery({ queryKey: ['kyc-status'], queryFn: kycApi.status });

  const verifyMutation = useMutation({
    mutationFn: () => kycApi.tier1({ bvn: form.bvn.trim(), phone: form.phone.trim() }),
    onSuccess: (data) => {
      haptic('success'); onKycUpdated(data.kycStatus);
      qc.invalidateQueries({ queryKey: ['kyc-status'] });
      qc.invalidateQueries({ queryKey: ['wallets'] });
      setView('overview');
    },
  });

  const isVerified = user.kycStatus === 'TIER_1' || user.kycStatus === 'TIER_2' || user.kycStatus === 'PENDING_REVIEW';
  const isReview   = user.kycStatus === 'PENDING_REVIEW';

  const canSubmit = form.bvn.trim().length === 11 && form.phone.trim().length >= 10;

  const progress = isVerified ? 100 : 10;

  // ── Verification Form ──────────────────────────────────────────────────
  if (view === 'verify') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '100px' }}>
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <button onClick={() => setView('overview')} className="icon-btn"><ArrowLeft size={18} color="var(--text)" /></button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 900 }}>Identity Verification</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>BVN &amp; Phone Number</p>
          </div>
        </div>
        <div style={{ padding: '0 20px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '8px' }}>BVN (Bank Verification Number)</label>
              <input
                className="input-field"
                placeholder="11-digit BVN"
                maxLength={11}
                inputMode="numeric"
                value={form.bvn}
                onChange={e => setForm(p => ({ ...p, bvn: e.target.value.replace(/\D/g, '') }))}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: '4px' }}>Your BVN is securely encrypted and never shared.</p>
            </div>
            <div style={{ marginBottom: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '8px' }}>Phone Number</label>
              <input
                className="input-field"
                placeholder="+2348012345678"
                inputMode="tel"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: '4px' }}>Use the phone number linked to your BVN.</p>
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={16} color="var(--emerald)" />
            <p style={{ fontSize: '12px', color: 'var(--emerald)', fontWeight: 600 }}>Your data is encrypted and securely protected.</p>
          </div>

          {verifyMutation.isError && (
            <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 600 }}>
                {(verifyMutation.error as any)?.response?.data?.error || 'Verification failed. Check your details and try again.'}
              </p>
            </div>
          )}
          <button className="btn-primary" onClick={() => verifyMutation.mutate()} disabled={!canSubmit || verifyMutation.isPending}>
            {verifyMutation.isPending ? (<><span className="spinner" style={{ width: 16, height: 16 }} /> Verifying…</>) : 'Verify Identity'}
          </button>
        </div>
      </div>
    );
  }

  // ── Overview ─────────────────────────────────────────────────────────────
  const steps = [
    {
      num: 1, label: 'Step 1', title: 'Identity Verification',
      desc: 'Provide your BVN and phone number', status: isVerified ? 'done' : 'active',
      sub: isVerified
        ? (isReview ? 'Under Review' : 'Verified ✓')
        : 'BVN + phone number required',
      action: !isVerified ? () => setView('verify') : null,
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
                  {isVerified ? (isReview ? 'Under review' : 'Identity verified!') : `${progress}% complete`}
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

        {/* Step timeline */}
        <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
          {steps.map((tier, i) => {
            const isDone    = tier.status === 'done';
            const isActive  = tier.status === 'active';
            const isPending = tier.status === 'pending';
            return (
              <div key={tier.num} style={{ display: 'flex', gap: '16px', paddingBottom: i < steps.length - 1 ? '20px' : 0 }}>
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
                  {i < steps.length - 1 && (
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
                      {isDone ? (isReview ? '⏳ Under Review' : '✓ Verified') : isActive ? '● In Progress' : 'Pending'}
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
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Estimated Time: 1-2 minutes to complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}

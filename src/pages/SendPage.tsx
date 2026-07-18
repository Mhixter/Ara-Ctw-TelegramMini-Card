import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Send, ArrowLeft, CheckCircle2, AlertCircle, X, ChevronRight, MessageSquare } from 'lucide-react';
import { walletApi } from '../lib/api';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';

interface Props { user: User; }
type Step = 'search' | 'amount' | 'confirm' | 'success';

interface Recipient {
  userId: string; username?: string; firstName?: string; kycStatus: string;
}

export default function SendPage({ user }: Props) {
  const qc = useQueryClient();
  const { haptic } = useTelegram();

  const [step, setStep]         = useState<Step>('search');
  const [query, setQuery]       = useState('');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount]     = useState('');
  const [note, setNote]         = useState('');
  const [lastRef, setLastRef]   = useState('');

  const { data: wallets = [] } = useQuery({ queryKey: ['wallets'], queryFn: walletApi.list });
  const ngnWallet = wallets.find((w: any) => w.currency === 'NGN');
  const balance   = Number(ngnWallet?.balance || 0);

  const searchMutation = useMutation({
    mutationFn: (q: string) => walletApi.searchUser(q),
    onSuccess: (data) => {
      if (data?.user) { setRecipient(data.user); setStep('amount'); haptic('success'); }
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => walletApi.send({ recipientUserId: recipient!.userId, amount: parseFloat(amount), note }),
    onSuccess: (data) => {
      haptic('success'); setLastRef(data.reference); setStep('success');
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  function handleSearch() {
    const q = query.trim().replace(/^@/, '');
    if (!q) return; searchMutation.mutate(q);
  }

  function reset() {
    setStep('search'); setQuery(''); setRecipient(null);
    setAmount(''); setNote(''); setLastRef('');
    searchMutation.reset(); sendMutation.reset();
  }

  const amtNum  = parseFloat(amount) || 0;
  const canSend = amtNum > 0 && amtNum <= balance && recipient !== null;

  // ── Success ──────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{
          width: '96px', height: '96px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.06))',
          border: '2px solid rgba(34,197,94,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px', boxShadow: '0 0 48px rgba(34,197,94,0.2)',
        }}>
          <CheckCircle2 size={48} color="var(--emerald)" strokeWidth={1.8} />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '6px', color: 'var(--text)' }}>Money Sent! 🎉</h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          ₦{amtNum.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-hint)', marginBottom: '32px' }}>
          to {recipient?.firstName || `@${recipient?.username}`}
        </p>

        <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', width: '100%', maxWidth: '340px', marginBottom: '28px', boxShadow: 'var(--shadow-sm)' }}>
          {[
            { label: 'Amount', value: `₦${amtNum.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, color: 'var(--emerald)' },
            { label: 'Fee', value: 'Free ✓', color: 'var(--emerald)' },
            { label: 'Reference', value: lastRef.slice(0, 16) + '…', color: 'var(--text-muted)' },
          ].map((row, i) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border-sm)' : 'none' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{row.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: row.color }}>{row.value}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MessageSquare size={14} /> Recipient notified on Telegram
        </p>
        <button className="btn-primary" onClick={reset} style={{ maxWidth: '280px' }}>
          Send Again
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
        {step !== 'search' && (
          <button
            onClick={() => { if (step === 'amount') { setStep('search'); setRecipient(null); } if (step === 'confirm') setStep('amount'); }}
            className="icon-btn"
          >
            <ArrowLeft size={18} color="var(--text)" />
          </button>
        )}
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {step === 'search' ? 'Transfer money to anyone, anywhere.' : step === 'amount' ? 'Enter amount to send' : 'Review your transfer'}
          </p>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.4px' }}>
            {step === 'search' ? 'Send Money' : step === 'amount' ? `To @${recipient?.username || recipient?.firstName}` : 'Review & Confirm'}
          </h1>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* ── STEP 1: Choose Recipient ── */}
        {step === 'search' && (
          <>
            {/* Section */}
            <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)', marginBottom: '14px' }}>
                1. Choose Recipient
              </p>
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <Search size={16} color="var(--text-hint)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  className="input-field"
                  placeholder="Search by Telegram username…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  style={{ paddingLeft: '44px', paddingRight: query ? '40px' : '16px' }}
                  autoFocus
                />
                {query && (
                  <button onClick={() => { setQuery(''); searchMutation.reset(); }} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-hint)' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                className="btn-primary"
                onClick={handleSearch}
                disabled={!query.trim() || searchMutation.isPending}
              >
                {searchMutation.isPending ? (<><span className="spinner" style={{ width: 16, height: 16 }} /> Searching…</>) : (<><Search size={16} /> Find User</>)}
              </button>
              {searchMutation.isError && (
                <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <AlertCircle size={16} color="var(--danger)" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger)' }}>User not found</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Make sure the user has signed into BorderPay on Telegram first.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Transfer method */}
            <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)', marginBottom: '14px' }}>2. Select Transfer Method</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {[
                  { icon: '📲', label: 'Wallet Transfer', desc: 'Send to BorderPay wallet', active: true },
                  { icon: '🌍', label: 'International', desc: 'Send money abroad', active: false },
                ].map(m => (
                  <div key={m.label} style={{
                    padding: '14px', borderRadius: '14px', cursor: m.active ? 'pointer' : 'not-allowed',
                    border: `1.5px solid ${m.active ? 'var(--purple)' : 'var(--border-sm)'}`,
                    background: m.active ? 'rgba(108,92,231,0.06)' : 'var(--surface-2)',
                    opacity: m.active ? 1 : 0.5,
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>{m.icon}</div>
                    <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px', color: m.active ? 'var(--purple)' : 'var(--text)' }}>{m.label}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Balance */}
            <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', boxShadow: 'var(--shadow-xs)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Available Balance</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--emerald)' }}>₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
          </>
        )}

        {/* ── STEP 2: Amount ── */}
        {step === 'amount' && recipient && (
          <>
            {/* Recipient card */}
            <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: 'var(--shadow-sm)' }}>
              <div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>
                {(recipient.firstName?.[0] || recipient.username?.[0] || '?').toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '16px', fontWeight: 800 }}>{recipient.firstName || `@${recipient.username}`}</p>
                {recipient.username && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{recipient.username}</p>}
              </div>
              <span className={`badge ${recipient.kycStatus !== 'PENDING' ? 'badge-success' : 'badge-pending'}`}>
                {recipient.kycStatus !== 'PENDING' ? 'Verified' : 'Unverified'}
              </span>
            </div>

            {/* Amount section */}
            <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px' }}>3. Enter Amount</p>

              {/* Amount display */}
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>You Send (NGN)</p>
                <div style={{ fontSize: '42px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-2px', minHeight: '56px' }}>
                  ₦{amtNum ? amtNum.toLocaleString('en-NG') : '0'}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Available: ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  {balance > 0 && (
                    <button onClick={() => setAmount(String(balance))} style={{ background: 'none', border: 'none', color: 'var(--purple)', fontWeight: 700, cursor: 'pointer', marginLeft: '8px', fontFamily: 'inherit', fontSize: '12px' }}>Max</button>
                  )}
                </p>
              </div>

              {/* Quick amounts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {[500, 1000, 5000, 10000].map(a => (
                  <button key={a} onClick={() => setAmount(String(a))} style={{
                    padding: '8px', borderRadius: '10px', border: `1.5px solid ${amount === String(a) ? 'var(--purple)' : 'var(--border)'}`,
                    background: amount === String(a) ? 'rgba(108,92,231,0.08)' : 'var(--surface-2)',
                    color: amount === String(a) ? 'var(--purple)' : 'var(--text-muted)',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    ₦{a.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Number pad */}
              <input
                className="input-field"
                type="number"
                placeholder="Or type amount…"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 800, textAlign: 'center' }}
                autoFocus
              />

              {amtNum > balance && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 600 }}>⚠️ Amount exceeds your wallet balance</p>
                </div>
              )}
            </div>

            {/* Note */}
            <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>5. Add Note (Optional)</p>
              <input
                className="input-field"
                placeholder="What's this payment for? (0/50)"
                value={note}
                onChange={e => setNote(e.target.value.slice(0, 50))}
              />
            </div>

            <button className="btn-primary" onClick={() => setStep('confirm')} disabled={!canSend}>
              Review &amp; Confirm <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* ── STEP 3: Confirm ── */}
        {step === 'confirm' && recipient && (
          <>
            {/* Transfer summary */}
            <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '16px' }}>TRANSFER SUMMARY</p>

              {/* Recipient row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '12px', background: 'var(--surface-2)', borderRadius: '14px' }}>
                <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
                  {(recipient.firstName?.[0] || recipient.username?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '14px' }}>{recipient.firstName || ''} {recipient.username ? `@${recipient.username}` : ''}</p>
                </div>
              </div>

              {[
                { label: 'You Send', value: `₦${amtNum.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, bold: true, color: 'var(--text)' },
                { label: 'Transfer Fee', value: 'Free ✓', bold: false, color: 'var(--emerald)' },
                { label: 'New Balance', value: `₦${(balance - amtNum).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, bold: false, color: 'var(--text-muted)' },
                ...(note ? [{ label: 'Note', value: note, bold: false, color: 'var(--text)' }] : []),
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border-sm)' : 'none' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{row.label}</span>
                  <span style={{ fontSize: row.bold ? '18px' : '13px', fontWeight: row.bold ? 900 : 700, color: row.color }}>{row.value}</span>
                </div>
              ))}

              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4M12 2L3 6.5V12c0 5 3.8 9.7 9 11 5.2-1.3 9-6 9-11V6.5L12 2z" stroke="var(--emerald)" strokeWidth="2"/></svg>
                <span style={{ fontSize: '12px', color: 'var(--emerald)', fontWeight: 600 }}>Your transfer is secure and encrypted</span>
              </div>
            </div>

            {sendMutation.isError && (
              <div style={{ padding: '12px 16px', marginBottom: '12px', borderRadius: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
                <p style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 600 }}>
                  {(sendMutation.error as any)?.response?.data?.error || 'Transfer failed. Please try again.'}
                </p>
              </div>
            )}

            <button className="btn-emerald" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
              {sendMutation.isPending ? (<><span className="spinner" style={{ width: 16, height: 16 }} /> Sending…</>) : (<><Send size={16} /> Confirm &amp; Send</>)}
            </button>
            <button className="btn-ghost" onClick={() => setStep('amount')} style={{ marginTop: '10px' }}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

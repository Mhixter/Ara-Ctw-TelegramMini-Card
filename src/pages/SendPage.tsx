import React, { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Send, ArrowLeft, CheckCircle2, AlertCircle, X, ChevronRight } from 'lucide-react';
import { walletApi } from '../lib/api';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';

interface Props { user: User; }

type Step = 'search' | 'amount' | 'confirm' | 'success';

interface Recipient {
  userId: string;
  username?: string;
  firstName?: string;
  kycStatus: string;
}

export default function SendPage({ user }: Props) {
  const qc = useQueryClient();
  const { haptic } = useTelegram();

  const [step, setStep] = useState<Step>('search');
  const [query, setQuery]           = useState('');
  const [recipient, setRecipient]   = useState<Recipient | null>(null);
  const [amount, setAmount]         = useState('');
  const [note, setNote]             = useState('');
  const [lastRef, setLastRef]       = useState('');

  // Wallet balance
  const { data: wallets = [] } = useQuery({ queryKey: ['wallets'], queryFn: walletApi.list });
  const ngnWallet = wallets.find((w: any) => w.currency === 'NGN');
  const balance   = Number(ngnWallet?.balance || 0);

  // Search users
  const searchMutation = useMutation({
    mutationFn: (q: string) => walletApi.searchUser(q),
    onSuccess: (data) => {
      if (data?.user) {
        setRecipient(data.user);
        setStep('amount');
        haptic('success');
      }
    },
  });

  // Send money
  const sendMutation = useMutation({
    mutationFn: () => walletApi.send({
      recipientUserId: recipient!.userId,
      amount: parseFloat(amount),
      note,
    }),
    onSuccess: (data) => {
      haptic('success');
      setLastRef(data.reference);
      setStep('success');
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  function handleSearch() {
    const q = query.trim().replace(/^@/, '');
    if (!q) return;
    searchMutation.mutate(q);
  }

  function reset() {
    setStep('search');
    setQuery('');
    setRecipient(null);
    setAmount('');
    setNote('');
    setLastRef('');
    searchMutation.reset();
    sendMutation.reset();
  }

  const amtNum = parseFloat(amount) || 0;
  const fee    = 0; // P2P is free
  const canSend = amtNum > 0 && amtNum <= balance && recipient !== null;

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="page" style={{ paddingTop: '40px', alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          width: '88px', height: '88px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))',
          border: '2px solid rgba(34,197,94,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 0 48px rgba(34,197,94,0.2)',
        }}>
          <CheckCircle2 size={44} color="var(--emerald)" strokeWidth={1.8} />
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>
          Sent!
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--tg-theme-hint-color)', marginBottom: '4px' }}>
          ₦{amtNum.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '32px' }}>
          to {recipient?.firstName || `@${recipient?.username}` || 'recipient'}
        </p>

        <div className="glass" style={{ width: '100%', padding: '18px 20px', marginBottom: '28px', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>Amount</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--emerald)' }}>
              ₦{amtNum.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>Fee</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Free</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>Reference</span>
            <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--tg-theme-hint-color)' }}>
              {lastRef.slice(0, 18)}…
            </span>
          </div>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '24px' }}>
          📱 Recipient notified on Telegram
        </p>

        <button className="btn-primary" onClick={reset} style={{ maxWidth: '280px' }}>
          Send Again
        </button>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingTop: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        {step !== 'search' && (
          <button
            onClick={() => {
              if (step === 'amount')  { setStep('search'); setRecipient(null); }
              if (step === 'confirm') { setStep('amount'); }
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--tg-theme-hint-color)', borderRadius: '10px', display: 'flex' }}
          >
            <ArrowLeft size={22} />
          </button>
        )}
        <div>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>
            {step === 'search' ? 'Send to' : step === 'amount' ? 'Enter amount' : 'Confirm transfer'}
          </p>
          <h1 style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.4px' }}>
            {step === 'search' ? 'Send Money' : step === 'amount' ? `To @${recipient?.username || recipient?.firstName}` : 'Review & Send'}
          </h1>
        </div>
      </div>

      {/* Balance pill */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '6px 14px', borderRadius: '20px', marginBottom: '24px',
        background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
      }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--emerald)' }} />
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--emerald)' }}>
          Balance: ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* ── STEP 1: Search ── */}
      {step === 'search' && (
        <>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <div style={{
              position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--tg-theme-hint-color)',
            }}>
              <Search size={18} />
            </div>
            <input
              className="input-field"
              placeholder="Telegram username (e.g. john)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={{ paddingLeft: '44px', paddingRight: query ? '44px' : '16px' }}
              autoFocus
            />
            {query && (
              <button
                onClick={() => { setQuery(''); searchMutation.reset(); }}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tg-theme-hint-color)',
                  display: 'flex', padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            className="btn-primary"
            onClick={handleSearch}
            disabled={!query.trim() || searchMutation.isPending}
            style={{ marginBottom: '24px' }}
          >
            {searchMutation.isPending ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block' }} />
                Searching…
              </>
            ) : (
              <><Search size={16} /> Find User</>
            )}
          </button>

          {/* Not found error */}
          {searchMutation.isError && (
            <div className="glass" style={{
              padding: '16px 18px', display: 'flex', gap: '12px', alignItems: 'flex-start',
              borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)',
            }}>
              <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger)', marginBottom: '2px' }}>User not found</p>
                <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>
                  Make sure the user has signed into BorderPay on Telegram first.
                </p>
              </div>
            </div>
          )}

          {/* Info card */}
          <div className="glass" style={{ padding: '18px 20px', marginTop: '8px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>How it works</p>
            {[
              { icon: '🔍', text: 'Search any BorderPay user by their Telegram username' },
              { icon: '💸', text: 'Transfer NGN instantly between wallets — completely free' },
              { icon: '📱', text: 'Both you and the recipient are notified on Telegram' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: i < 2 ? '10px' : 0 }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', lineHeight: '1.5' }}>{item.text}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── STEP 2: Amount ── */}
      {step === 'amount' && recipient && (
        <>
          {/* Recipient card */}
          <div className="glass" style={{ padding: '18px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
              {(recipient.firstName?.[0] || recipient.username?.[0] || '?').toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.2px' }}>
                {recipient.firstName || `@${recipient.username}`}
              </p>
              {recipient.username && (
                <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>@{recipient.username}</p>
              )}
            </div>
            <span className={`badge ${recipient.kycStatus !== 'PENDING' ? 'badge-success' : 'badge-pending'}`}>
              {recipient.kycStatus !== 'PENDING' ? 'Verified' : 'Unverified'}
            </span>
          </div>

          {/* Amount input */}
          <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '8px', fontWeight: 600 }}>Amount (NGN)</p>
          <input
            className="input-field"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ fontSize: '28px', fontWeight: 900, marginBottom: '14px', textAlign: 'center', letterSpacing: '-1px' }}
            autoFocus
          />

          {/* Quick amounts */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {[500, 1000, 5000, 10000].map(amt => (
              <button key={amt} onClick={() => setAmount(String(amt))} style={{
                flex: 1, minWidth: '60px',
                padding: '8px 6px', borderRadius: '12px', border: '1px solid',
                borderColor: amount === String(amt) ? 'var(--purple)' : 'var(--glass-border)',
                background: amount === String(amt) ? 'rgba(108,92,231,0.12)' : 'transparent',
                color: amount === String(amt) ? 'var(--purple)' : 'var(--tg-theme-hint-color)',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                ₦{amt.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Use max */}
          {balance > 0 && (
            <button
              onClick={() => setAmount(String(balance))}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', width: '100%',
                textAlign: 'center', fontSize: '12px', color: 'var(--purple)', fontWeight: 700,
                marginBottom: '16px', fontFamily: 'inherit', padding: '4px',
              }}
            >
              Use max (₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })})
            </button>
          )}

          {/* Note */}
          <input
            className="input-field"
            placeholder="Add a note (optional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ marginBottom: '24px', fontSize: '14px' }}
          />

          {/* Validation */}
          {amtNum > balance && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 600 }}>
                ⚠️ Amount exceeds your wallet balance
              </p>
            </div>
          )}

          <button
            className="btn-primary"
            onClick={() => setStep('confirm')}
            disabled={!canSend}
          >
            Continue <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* ── STEP 3: Confirm ── */}
      {step === 'confirm' && recipient && (
        <>
          <div className="glass" style={{ padding: '24px', marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '20px', fontWeight: 600 }}>
              TRANSFER SUMMARY
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>To</span>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>
                {recipient.firstName || ''} {recipient.username ? `@${recipient.username}` : ''}
              </span>
            </div>

            <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0 0 14px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>Amount</span>
              <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--emerald)', letterSpacing: '-0.5px' }}>
                ₦{amtNum.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>Fee</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--emerald)' }}>Free ✓</span>
            </div>

            {note && (
              <>
                <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0 0 14px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>Note</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{note}</span>
                </div>
              </>
            )}

            <div style={{ height: '1px', background: 'var(--glass-border)', margin: '14px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>New balance</span>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>
                ₦{(balance - amtNum).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {sendMutation.isError && (
            <div className="glass" style={{
              padding: '14px 16px', marginBottom: '16px',
              borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)',
            }}>
              <p style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 600 }}>
                {(sendMutation.error as any)?.response?.data?.error || 'Transfer failed. Please try again.'}
              </p>
            </div>
          )}

          <button
            className="btn-emerald"
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending}
          >
            {sendMutation.isPending ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block' }} />
                Sending…
              </>
            ) : (
              <><Send size={16} /> Confirm & Send</>
            )}
          </button>

          <button className="btn-ghost" onClick={() => setStep('amount')} style={{ marginTop: '10px' }}>
            Back
          </button>
        </>
      )}
    </div>
  );
}

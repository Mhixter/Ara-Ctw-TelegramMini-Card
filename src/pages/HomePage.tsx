import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownCircle, ArrowUpCircle, RefreshCw, Plus,
  AlertCircle, Wallet, ChevronRight, Copy, CheckCircle2
} from 'lucide-react';
import { walletApi } from '../lib/api';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';
import TransactionReceipt from '../components/TransactionReceipt';

interface Props { user: User; }

export default function HomePage({ user }: Props) {
  const qc = useQueryClient();
  const { haptic } = useTelegram();
  const [fundModal, setFundModal]   = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [receiptTx, setReceiptTx]   = useState<any | null>(null);
  const [copied, setCopied]         = useState(false);

  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: walletApi.list,
    refetchInterval: 30_000,
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: walletApi.transactions,
    refetchInterval: 30_000,
  });

  const fundMutation = useMutation({
    mutationFn: () => walletApi.fund(parseFloat(fundAmount), 'NGN'),
    onSuccess: () => {
      haptic('success');
      setFundModal(false);
      setFundAmount('');
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const ngnWallet = wallets.find((w: any) => w.currency === 'NGN');
  const kycBanner = user.kycStatus === 'PENDING';
  const balance   = Number(ngnWallet?.balance || 0);

  function copyAccount() {
    if (!ngnWallet?.virtual_account_number) return;
    navigator.clipboard.writeText(ngnWallet.virtual_account_number).then(() => {
      setCopied(true);
      haptic('success');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function purposeLabel(p: string) {
    const map: Record<string, string> = {
      WALLET_FUNDING:    'Wallet Funded',
      CARD_ISSUANCE:     'Card Issued',
      CARD_SPEND:        'Card Purchase',
      CARD_FUNDING:      'Card Funded',
      MERCHANT_PURCHASE: 'Purchase',
      FEE_CHARGE:        'Fee',
      P2P_SEND:          'Sent to User',
      P2P_RECEIVE:       'Received',
    };
    return map[p] || p;
  }

  function txColor(tx: any) {
    if (tx.credit_wallet_id) return 'var(--emerald)';
    if (tx.purpose === 'FEE_CHARGE') return 'var(--danger)';
    return 'var(--danger)';
  }

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="page" style={{ paddingTop: '20px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', fontWeight: 600 }}>{greet} 👋</p>
          <h1 style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', marginTop: '2px' }}>
            {user.firstName || user.username || 'Welcome'}
          </h1>
        </div>
        <div className="avatar">
          {(user.firstName?.[0] || user.username?.[0] || 'B').toUpperCase()}
        </div>
      </div>

      {/* ── KYC Banner ── */}
      {kycBanner && (
        <div className="glass fade-in-up" style={{
          padding: '14px 16px', marginBottom: '18px',
          display: 'flex', gap: '12px', alignItems: 'center',
          borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)',
          borderRadius: '18px',
        }}>
          <AlertCircle size={20} color="var(--warning)" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--warning)' }}>Identity not verified</p>
            <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginTop: '2px' }}>
              Verify your identity to unlock cards &amp; higher limits
            </p>
          </div>
        </div>
      )}

      {/* ── Balance card ── */}
      <div className="glass" style={{
        padding: '24px',
        marginBottom: '14px',
        background: 'linear-gradient(135deg, rgba(108,92,231,0.12), rgba(34,197,94,0.06))',
        borderColor: 'rgba(108,92,231,0.2)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow blob */}
        <div style={{
          position: 'absolute', top: '-30px', right: '-20px',
          width: '120px', height: '120px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,92,231,0.2), transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'rgba(34,197,94,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Wallet size={15} color="var(--emerald)" />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--tg-theme-hint-color)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              NGN Wallet
            </span>
          </div>
          {ngnWallet && <span className="badge badge-success" style={{ fontSize: '10px' }}>Active</span>}
        </div>

        {walletsLoading ? (
          <div className="skeleton" style={{ height: '48px', borderRadius: '10px', marginBottom: '16px' }} />
        ) : (
          <>
            <p style={{
              fontSize: '38px', fontWeight: 900, lineHeight: 1,
              color: 'var(--tg-theme-text-color)', marginBottom: '14px',
              letterSpacing: '-2px',
            }}>
              <span style={{ fontSize: '22px', fontWeight: 700, opacity: 0.7, letterSpacing: 0 }}>₦</span>
              {balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>

            {/* Virtual account row */}
            {ngnWallet?.virtual_account_number ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div>
                  <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
                    {ngnWallet.virtual_bank_name || 'Virtual Account'}
                  </p>
                  <p style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '1px', fontFamily: 'monospace' }}>
                    {ngnWallet.virtual_account_number}
                  </p>
                </div>
                <button
                  onClick={copyAccount}
                  style={{
                    background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)',
                    border: copied ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', padding: '8px 12px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                    color: copied ? 'var(--emerald)' : 'var(--tg-theme-hint-color)',
                    fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                >
                  {copied
                    ? <><CheckCircle2 size={13} /> Copied!</>
                    : <><Copy size={13} /> Copy</>
                  }
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginTop: '4px' }}>
                Complete KYC to receive a dedicated bank account number
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '28px' }}>
        <button className="btn-primary" style={{ padding: '14px', fontSize: '14px' }} onClick={() => setFundModal(true)}>
          <Plus size={16} /> Add Money
        </button>
        <button className="btn-ghost" style={{ padding: '14px', fontSize: '14px' }} onClick={() => qc.invalidateQueries()}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* ── Recent transactions ── */}
      <div className="section-header">
        <h2 className="section-title">Recent Activity</h2>
        <span style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', fontWeight: 600 }}>{transactions.length} txns</span>
      </div>

      {txLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '64px', borderRadius: '18px' }} />)}
        </div>
      ) : transactions.length === 0 ? (
        <div className="glass" style={{ padding: '36px 24px', textAlign: 'center', borderRadius: '24px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💸</div>
          <p style={{ fontWeight: 700, marginBottom: '4px' }}>No transactions yet</p>
          <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '13px' }}>Add money to get started</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {transactions.slice(0, 20).map((tx: any) => {
            const isCredit = !!tx.credit_wallet_id;
            const meta = (() => { try { return JSON.parse(tx.metadata || '{}'); } catch { return {}; } })();
            const color = txColor(tx);
            return (
              <div
                key={tx.id}
                className="glass"
                onClick={() => setReceiptTx(tx)}
                style={{
                  padding: '14px 16px', display: 'flex', alignItems: 'center',
                  gap: '12px', cursor: 'pointer', borderRadius: '20px',
                  transition: 'opacity 0.15s, transform 0.15s',
                }}
                onPointerDown={e => (e.currentTarget.style.opacity = '0.65')}
                onPointerUp={e => (e.currentTarget.style.opacity = '1')}
                onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                  background: isCredit ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isCredit
                    ? <ArrowDownCircle size={17} color="var(--emerald)" />
                    : <ArrowUpCircle  size={17} color="var(--danger)"  />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px', letterSpacing: '-0.1px' }}>
                    {purposeLabel(tx.purpose)}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {meta.merchant
                      ? `${meta.merchant}${meta.mask_pan ? ` · ${meta.mask_pan}` : ''}`
                      : meta.recipientName
                        ? `To ${meta.recipientName}`
                        : meta.senderName
                          ? `From ${meta.senderName}`
                          : new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    }
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 800, color, letterSpacing: '-0.3px' }}>
                    {isCredit ? '+' : '-'}₦{Number(tx.amount).toLocaleString('en-NG')}
                  </p>
                  <ChevronRight size={14} color="var(--tg-theme-hint-color)" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Transaction receipt modal ── */}
      {receiptTx && <TransactionReceipt tx={receiptTx} onClose={() => setReceiptTx(null)} />}

      {/* ── Fund wallet modal ── */}
      {fundModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
        }}>
          <div className="glass-strong slide-up" style={{
            width: '100%', maxWidth: '480px',
            padding: '28px 24px 40px',
            borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '6px', letterSpacing: '-0.4px' }}>Add Money</h3>
            <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '22px' }}>
              {ngnWallet?.virtual_account_number
                ? `Transfer to ${ngnWallet.virtual_bank_name} · ${ngnWallet.virtual_account_number}`
                : 'Enter an amount to add to your wallet'}
            </p>

            <input
              className="input-field"
              type="number"
              placeholder="Amount in ₦ (e.g. 10,000)"
              value={fundAmount}
              onChange={e => setFundAmount(e.target.value)}
              style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 800 }}
              autoFocus
            />

            {/* Quick chips */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '22px', flexWrap: 'wrap' }}>
              {[5000, 10000, 20000, 50000].map(amt => (
                <button key={amt} onClick={() => setFundAmount(String(amt))} style={{
                  flex: 1, minWidth: '60px',
                  padding: '8px 6px', borderRadius: '12px', border: '1px solid',
                  borderColor: fundAmount === String(amt) ? 'var(--emerald)' : 'var(--glass-border)',
                  background:  fundAmount === String(amt) ? 'rgba(34,197,94,0.12)' : 'transparent',
                  color:       fundAmount === String(amt) ? 'var(--emerald)' : 'var(--tg-theme-hint-color)',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" onClick={() => { setFundModal(false); setFundAmount(''); }} style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => fundMutation.mutate()}
                disabled={!fundAmount || parseFloat(fundAmount) <= 0 || fundMutation.isPending}
              >
                {fundMutation.isPending ? 'Processing…' : 'Fund Now'}
              </button>
            </div>

            {fundMutation.isError && (
              <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '12px', textAlign: 'center', fontWeight: 600 }}>
                {(fundMutation.error as any)?.response?.data?.error || 'Failed. Please try again.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

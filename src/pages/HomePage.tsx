import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Send, Plus, AlertCircle, Wallet, ChevronRight } from 'lucide-react';
import { walletApi } from '../lib/api';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';
import TransactionReceipt from '../components/TransactionReceipt';

interface Props { user: User; }

export default function HomePage({ user }: Props) {
  const qc = useQueryClient();
  const { haptic } = useTelegram();
  const [fundModal, setFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [receiptTx, setReceiptTx] = useState<any | null>(null);

  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: walletApi.list,
    refetchInterval: 30_000
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: walletApi.transactions,
    refetchInterval: 30_000
  });

  const fundMutation = useMutation({
    mutationFn: () => walletApi.fund(parseFloat(fundAmount), 'NGN'),
    onSuccess: () => {
      haptic('success');
      setFundModal(false);
      setFundAmount('');
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const ngnWallet = wallets.find((w: any) => w.currency === 'NGN');
  const kycBanner = user.kycStatus === 'PENDING';

  function purposeLabel(p: string) {
    const map: Record<string, string> = {
      WALLET_FUNDING:    'Wallet Funded',
      CARD_ISSUANCE:     'Card Issued',
      CARD_SPEND:        'Card Purchase',
      CARD_FUNDING:      'Card Funded',
      MERCHANT_PURCHASE: 'Purchase',
      FEE_CHARGE:        'Fee',
    };
    return map[p] || p;
  }

  function purposeColor(p: string) {
    if (p === 'WALLET_FUNDING' || p === 'CARD_FUNDING') return 'var(--success)';
    if (p === 'CARD_ISSUANCE') return 'var(--gold)';
    if (p === 'CARD_SPEND') return 'var(--accent)';
    if (p === 'FEE_CHARGE') return 'var(--danger)';
    return 'var(--warning)';
  }

  return (
    <div className="page" style={{ paddingTop: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>Good day 👋</p>
          <h1 style={{ fontSize: '22px', fontWeight: 800 }}>
            {user.firstName || user.username || 'Welcome'}
          </h1>
        </div>
        <div className="avatar">
          {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
        </div>
      </div>

      {/* KYC Banner */}
      {kycBanner && (
        <div className="glass fade-in-up" style={{
          padding: '14px 16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center',
          borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)'
        }}>
          <AlertCircle size={20} color="var(--warning)" />
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--warning)' }}>Identity not verified</p>
            <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginTop: '2px' }}>
              Verify your identity to unlock cards & higher limits
            </p>
          </div>
        </div>
      )}

      {/* NGN Wallet Card */}
      <div className="glass" style={{
        padding: '24px', marginBottom: '20px',
        borderColor: 'rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={16} color="var(--success)" />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--tg-theme-hint-color)', letterSpacing: '1px' }}>NGN WALLET</span>
          </div>
          {ngnWallet && (
            <span className="badge badge-success" style={{ fontSize: '10px' }}>Active</span>
          )}
        </div>

        {walletsLoading ? (
          <div className="skeleton" style={{ height: '40px', borderRadius: '8px' }} />
        ) : (
          <>
            <p style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1, color: 'var(--success)', marginBottom: '8px' }}>
              ₦{Number(ngnWallet?.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
            {ngnWallet?.virtual_account_number ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>
                  {ngnWallet.virtual_bank_name} · <strong style={{ color: 'var(--tg-theme-text-color)' }}>{ngnWallet.virtual_account_number}</strong>
                </p>
              </div>
            ) : (
              <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginTop: '4px' }}>
                Complete KYC to get a virtual bank account
              </p>
            )}
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '28px' }}>
        <button className="btn-primary" style={{ padding: '14px', fontSize: '14px' }} onClick={() => setFundModal(true)}>
          <Plus size={16} /> Fund Wallet
        </button>
        <button className="btn-ghost" style={{ padding: '14px', fontSize: '14px' }} onClick={() => qc.invalidateQueries()}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Recent Transactions */}
      <div className="section-header">
        <h2 className="section-title">Recent Activity</h2>
        <span style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>{transactions.length} txns</span>
      </div>

      {txLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '60px', borderRadius: '12px' }} />)}
        </div>
      ) : transactions.length === 0 ? (
        <div className="glass" style={{ padding: '32px', textAlign: 'center' }}>
          <Send size={32} strokeWidth={1} style={{ color: 'var(--tg-theme-hint-color)', margin: '0 auto 10px' }} />
          <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px' }}>No transactions yet</p>
          <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '12px', marginTop: '4px' }}>Fund your wallet to get started</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {transactions.slice(0, 20).map((tx: any) => {
            const isCredit = !!tx.credit_wallet_id;
            const meta = (() => { try { return JSON.parse(tx.metadata || '{}'); } catch { return {}; } })();
            return (
              <div
                key={tx.id}
                className="glass"
                onClick={() => setReceiptTx(tx)}
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'opacity 0.15s' }}
                onPointerDown={e => (e.currentTarget.style.opacity = '0.7')}
                onPointerUp={e => (e.currentTarget.style.opacity = '1')}
                onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                  background: `${purposeColor(tx.purpose)}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {isCredit
                    ? <ArrowDownCircle size={17} color="var(--success)" />
                    : <ArrowUpCircle size={17} color="var(--danger)" />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{purposeLabel(tx.purpose)}</p>
                  <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {meta.merchant
                      ? `${meta.merchant}${meta.mask_pan ? ` · ${meta.mask_pan}` : ''}`
                      : new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    }
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: isCredit ? 'var(--success)' : 'var(--danger)' }}>
                    {isCredit ? '+' : '-'}₦{Number(tx.amount).toLocaleString('en-NG')}
                  </p>
                  <ChevronRight size={14} color="var(--tg-theme-hint-color)" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction Receipt Modal */}
      {receiptTx && <TransactionReceipt tx={receiptTx} onClose={() => setReceiptTx(null)} />}

      {/* Fund Modal */}
      {fundModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200
        }}>
          <div className="glass-strong" style={{ width: '100%', maxWidth: '480px', padding: '28px 24px 36px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Fund NGN Wallet</h3>
            <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '20px' }}>
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
              style={{ marginBottom: '20px' }}
              autoFocus
            />
            {/* Quick amount chips */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[5000, 10000, 20000, 50000].map(amt => (
                <button key={amt} onClick={() => setFundAmount(String(amt))} style={{
                  padding: '6px 14px', borderRadius: '20px', border: '1px solid',
                  borderColor: fundAmount === String(amt) ? 'var(--success)' : 'var(--glass-border)',
                  background: fundAmount === String(amt) ? 'rgba(34,197,94,0.12)' : 'transparent',
                  color: fundAmount === String(amt) ? 'var(--success)' : 'var(--tg-theme-hint-color)',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                }}>
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" onClick={() => { setFundModal(false); setFundAmount(''); }} style={{ flex: 1 }}>Cancel</button>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => fundMutation.mutate()}
                disabled={!fundAmount || parseFloat(fundAmount) <= 0 || fundMutation.isPending}
              >
                {fundMutation.isPending ? 'Processing...' : 'Fund Now'}
              </button>
            </div>
            {fundMutation.isError && (
              <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '10px', textAlign: 'center' }}>
                {(fundMutation.error as any)?.response?.data?.error || 'Failed. Try again.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

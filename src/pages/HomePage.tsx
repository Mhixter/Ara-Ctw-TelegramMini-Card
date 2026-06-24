import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDownCircle, ArrowUpCircle, TrendingUp, RefreshCw, Send, Plus, AlertCircle } from 'lucide-react';
import { walletApi } from '../lib/api';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';

interface Props { user: User; }

export default function HomePage({ user }: Props) {
  const qc = useQueryClient();
  const { haptic } = useTelegram();
  const [fundModal, setFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [fundCurrency, setFundCurrency] = useState<'NGN' | 'USD'>('NGN');

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
    mutationFn: () => walletApi.fund(parseFloat(fundAmount), fundCurrency),
    onSuccess: () => {
      haptic('success');
      setFundModal(false);
      setFundAmount('');
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const ngnWallet = wallets.find((w: any) => w.currency === 'NGN');
  const usdWallet = wallets.find((w: any) => w.currency === 'USD');

  const kycBanner = user.kycStatus === 'PENDING';

  function formatAmount(amount: number, currency: string) {
    if (currency === 'NGN') return `₦${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  function purposeLabel(p: string) {
    const map: Record<string, string> = {
      WALLET_FUNDING: 'Wallet Funded',
      CARD_ISSUANCE: 'Card Issued',
      CARD_SPEND: 'Card Purchase',
      CARD_FUNDING: 'Card Funded',
      MERCHANT_PURCHASE: 'Purchase',
      FEE_CHARGE: 'Fee'
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

      {/* Wallet Balances */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        {walletsLoading ? (
          <>
            <div className="skeleton" style={{ height: '100px', borderRadius: '16px' }} />
            <div className="skeleton" style={{ height: '100px', borderRadius: '16px' }} />
          </>
        ) : (
          <>
            <div className="glass" style={{ padding: '16px', borderColor: 'rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tg-theme-hint-color)', letterSpacing: '1px' }}>NGN WALLET</span>
                <ArrowDownCircle size={16} color="var(--success)" />
              </div>
              <p style={{ fontSize: '20px', fontWeight: 800, lineHeight: 1, color: 'var(--success)' }}>
                ₦{Number(ngnWallet?.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 })}
              </p>
              {ngnWallet?.virtual_account_number && (
                <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', marginTop: '6px' }}>
                  {ngnWallet.virtual_bank_name} · {ngnWallet.virtual_account_number}
                </p>
              )}
            </div>

            <div className="glass" style={{ padding: '16px', borderColor: 'rgba(108,99,255,0.2)', background: 'rgba(108,99,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tg-theme-hint-color)', letterSpacing: '1px' }}>USD WALLET</span>
                <TrendingUp size={16} color="var(--accent)" />
              </div>
              <p style={{ fontSize: '20px', fontWeight: 800, lineHeight: 1, color: 'var(--accent)' }}>
                ${Number(usdWallet?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', marginTop: '6px' }}>Available balance</p>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '28px' }}>
        <button className="btn-primary" style={{ padding: '12px', fontSize: '14px' }} onClick={() => setFundModal(true)}>
          <Plus size={16} /> Fund Wallet
        </button>
        <button className="btn-ghost" style={{ padding: '12px', fontSize: '14px' }} onClick={() => qc.invalidateQueries()}>
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
          {transactions.slice(0, 20).map((tx: any) => (
            <div key={tx.id} className="glass" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                background: `${purposeColor(tx.purpose)}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {tx.credit_wallet_id
                  ? <ArrowDownCircle size={16} color="var(--success)" />
                  : <ArrowUpCircle size={16} color="var(--danger)" />
                }
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 600 }}>{purposeLabel(tx.purpose)}</p>
                <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginTop: '2px' }}>
                  {new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: tx.credit_wallet_id ? 'var(--success)' : 'var(--danger)' }}>
                {tx.credit_wallet_id ? '+' : '-'}
                {tx.debit_currency === 'NGN' || tx.credit_currency === 'NGN'
                  ? `₦${Number(tx.amount).toLocaleString()}`
                  : `$${Number(tx.amount).toFixed(2)}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Fund Modal */}
      {fundModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, padding: '0 0 env(safe-area-inset-bottom)'
        }}>
          <div className="glass-strong" style={{ width: '100%', maxWidth: '480px', padding: '28px 24px 32px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Fund Wallet</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['NGN', 'USD'] as const).map(c => (
                <button key={c} onClick={() => setFundCurrency(c)} style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid',
                  borderColor: fundCurrency === c ? 'var(--accent)' : 'var(--glass-border)',
                  background: fundCurrency === c ? 'rgba(108,99,255,0.15)' : 'transparent',
                  color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                }}>{c}</button>
              ))}
            </div>
            <input
              className="input-field"
              type="number"
              placeholder={fundCurrency === 'NGN' ? 'Amount in ₦ (e.g. 5000)' : 'Amount in $ (e.g. 10)'}
              value={fundAmount}
              onChange={e => setFundAmount(e.target.value)}
              style={{ marginBottom: '16px' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" onClick={() => setFundModal(false)} style={{ flex: 1 }}>Cancel</button>
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

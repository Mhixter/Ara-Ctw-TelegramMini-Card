import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownCircle, ArrowUpCircle, RefreshCw, Send, Plus,
  AlertCircle, Wallet, ChevronRight, Eye, EyeOff, Copy,
  CheckCircle2, CreditCard, ArrowLeftRight, BarChart3,
  TrendingUp, TrendingDown, DollarSign, Zap
} from 'lucide-react';
import { walletApi } from '../lib/api';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';
import TransactionReceipt from '../components/TransactionReceipt';

interface Props { user: User; }

export default function HomePage({ user }: Props) {
  const qc = useQueryClient();
  const { haptic } = useTelegram();
  const [fundModal, setFundModal] = useState(false);
  const [sendModal, setSendModal] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendRecipient, setSendRecipient] = useState('');
  const [receiptTx, setReceiptTx] = useState<any | null>(null);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [copiedAcct, setCopiedAcct] = useState(false);

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

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  function purposeLabel(p: string) {
    const map: Record<string, string> = {
      WALLET_FUNDING: 'Wallet Funded',
      CARD_ISSUANCE:  'Card Issued',
      CARD_SPEND:     'Card Purchase',
      CARD_FUNDING:   'Card Funded',
      MERCHANT_PURCHASE: 'Purchase',
      FEE_CHARGE:     'Fee',
    };
    return map[p] || p;
  }

  function purposeIcon(p: string, isCredit: boolean) {
    if (p === 'CARD_ISSUANCE') return { bg: 'rgba(244,180,0,0.12)', color: 'var(--gold)', emoji: '💳' };
    if (p === 'FEE_CHARGE') return { bg: 'rgba(239,68,68,0.1)', color: 'var(--danger)', emoji: '📋' };
    if (isCredit) return { bg: 'rgba(34,197,94,0.1)', color: 'var(--success)', emoji: '⬇️' };
    return { bg: 'rgba(239,68,68,0.1)', color: 'var(--danger)', emoji: '⬆️' };
  }

  // Simple analytics from transactions
  const income = transactions.filter((tx: any) => !!tx.credit_wallet_id).reduce((s: number, tx: any) => s + Number(tx.amount), 0);
  const expense = transactions.filter((tx: any) => !tx.credit_wallet_id).reduce((s: number, tx: any) => s + Number(tx.amount), 0);
  const maxVal = Math.max(income, expense, 1);

  function copyAccount() {
    if (ngnWallet?.virtual_account_number) {
      navigator.clipboard.writeText(ngnWallet.virtual_account_number);
      setCopiedAcct(true);
      setTimeout(() => setCopiedAcct(false), 2000);
      haptic('success');
    }
  }

  const quickActions = [
    { icon: Plus, label: 'Fund', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', action: () => setFundModal(true) },
    { icon: Send, label: 'Send', color: '#6C5CE7', bg: 'rgba(108,92,231,0.12)', action: () => setSendModal(true) },
    { icon: ArrowDownCircle, label: 'Receive', color: '#F4B400', bg: 'rgba(244,180,0,0.12)', action: () => {} },
    { icon: ArrowLeftRight, label: 'Exchange', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', action: () => {} },
    { icon: CreditCard, label: 'Cards', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', action: () => {} },
    { icon: BarChart3, label: 'Analytics', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', action: () => {} },
  ];

  return (
    <div className="page" style={{ paddingTop: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '2px' }}>
            {greeting} 👋
          </p>
          <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            {user.firstName || user.username || 'Welcome'}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => qc.invalidateQueries()}
            style={{ background: 'none', border: 'none', color: 'var(--tg-theme-hint-color)', cursor: 'pointer', padding: '4px', display: 'flex' }}
          >
            <RefreshCw size={16} />
          </button>
          <div className="avatar">
            {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
          </div>
        </div>
      </div>

      {/* KYC Banner */}
      {kycBanner && (
        <div className="glass fade-in-up" style={{
          padding: '14px 16px', marginBottom: '18px', display: 'flex', gap: '12px', alignItems: 'center',
          borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)',
          borderRadius: '16px',
        }}>
          <AlertCircle size={20} color="var(--warning)" />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--warning)' }}>Identity not verified</p>
            <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginTop: '2px' }}>
              Verify your identity to unlock cards & higher limits
            </p>
          </div>
          <ChevronRight size={16} color="var(--warning)" />
        </div>
      )}

      {/* Wallet Balance Card */}
      <div className="glass" style={{
        padding: '22px', marginBottom: '16px',
        background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(16,163,74,0.04) 100%)',
        borderColor: 'rgba(34,197,94,0.2)',
        borderRadius: '24px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background accent */}
        <div style={{
          position: 'absolute', top: '-30px', right: '-30px',
          width: '130px', height: '130px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '11px', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={17} color="var(--success)" />
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tg-theme-hint-color)', letterSpacing: '1px', textTransform: 'uppercase' }}>NGN Wallet</span>
              {ngnWallet && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--success)', animation: 'pulse-dot 2s infinite' }} />
                  <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 600 }}>Active</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setBalanceHidden(h => !h)}
            style={{ background: 'none', border: 'none', color: 'var(--tg-theme-hint-color)', cursor: 'pointer', padding: '4px', display: 'flex' }}
          >
            {balanceHidden ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        {walletsLoading ? (
          <div className="skeleton" style={{ height: '44px', borderRadius: '10px', marginBottom: '14px' }} />
        ) : (
          <>
            <p style={{ fontSize: '34px', fontWeight: 900, lineHeight: 1, color: 'var(--success)', marginBottom: '10px', letterSpacing: '-1px' }}>
              {balanceHidden
                ? '₦ ••••••'
                : `₦${Number(ngnWallet?.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
              }
            </p>

            {ngnWallet?.virtual_account_number ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34,197,94,0.08)', borderRadius: '10px', padding: '8px 12px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--success)', marginBottom: '1px' }}>{ngnWallet.virtual_bank_name}</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tg-theme-text-color)', fontFamily: '"Courier New", monospace', letterSpacing: '1px' }}>
                    {ngnWallet.virtual_account_number}
                  </p>
                </div>
                <button
                  onClick={copyAccount}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedAcct ? 'var(--success)' : 'var(--tg-theme-hint-color)', display: 'flex', padding: '4px' }}
                >
                  {copiedAcct ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px 12px' }}>
                Complete KYC to get a virtual bank account
              </p>
            )}
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '22px' }}>
        {quickActions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              className="quick-action"
              onClick={action.action}
            >
              <div className="quick-action-icon" style={{ background: action.bg }}>
                <Icon size={20} color={action.color} strokeWidth={2} />
              </div>
              <span style={{ color: 'var(--tg-theme-text-color)', fontSize: '11px', fontWeight: 600 }}>{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Analytics Card */}
      {transactions.length > 0 && (
        <div className="glass" style={{ padding: '18px', marginBottom: '22px', borderRadius: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '-0.2px' }}>Overview</p>
              <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginTop: '2px' }}>Income vs Expenses</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>
              <TrendingUp size={14} color="var(--success)" />
              <span>All time</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Income bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={12} color="var(--success)" />
                  <span style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', fontWeight: 500 }}>Income</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--success)' }}>
                  ₦{income.toLocaleString('en-NG')}
                </span>
              </div>
              <div className="analytics-bar-track">
                <div className="analytics-bar-fill" style={{ width: `${(income / maxVal) * 100}%`, background: 'var(--success)' }} />
              </div>
            </div>

            {/* Expense bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingDown size={12} color="var(--danger)" />
                  <span style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', fontWeight: 500 }}>Expenses</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--danger)' }}>
                  ₦{expense.toLocaleString('en-NG')}
                </span>
              </div>
              <div className="analytics-bar-track">
                <div className="analytics-bar-fill" style={{ width: `${(expense / maxVal) * 100}%`, background: 'var(--danger)' }} />
              </div>
            </div>
          </div>

          {/* Net */}
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>Net balance</span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: income >= expense ? 'var(--success)' : 'var(--danger)', letterSpacing: '-0.3px' }}>
              {income >= expense ? '+' : '-'}₦{Math.abs(income - expense).toLocaleString('en-NG')}
            </span>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="section-header">
        <h2 className="section-title">Recent Transactions</h2>
        <span style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', fontWeight: 600 }}>{transactions.length} total</span>
      </div>

      {txLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '64px', borderRadius: '16px' }} />)}
        </div>
      ) : transactions.length === 0 ? (
        <div className="glass" style={{ padding: '36px 24px', textAlign: 'center', borderRadius: '20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💳</div>
          <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px', fontWeight: 600 }}>No transactions yet</p>
          <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '12px', marginTop: '4px' }}>Fund your wallet to get started</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {transactions.slice(0, 20).map((tx: any) => {
            const isCredit = !!tx.credit_wallet_id;
            const meta = (() => { try { return JSON.parse(tx.metadata || '{}'); } catch { return {}; } })();
            const { bg, color, emoji } = purposeIcon(tx.purpose, isCredit);
            return (
              <div
                key={tx.id}
                className="glass"
                onClick={() => setReceiptTx(tx)}
                style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'opacity 0.15s', borderRadius: '18px' }}
                onPointerDown={e => (e.currentTarget.style.opacity = '0.65')}
                onPointerUp={e => (e.currentTarget.style.opacity = '1')}
                onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '13px', flexShrink: 0,
                  background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px',
                }}>
                  {emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px', letterSpacing: '-0.1px' }}>{purposeLabel(tx.purpose)}</p>
                  <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {meta.merchant
                      ? `${meta.merchant}${meta.mask_pan ? ` · ${meta.mask_pan}` : ''}`
                      : new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    }
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 800, color: isCredit ? 'var(--success)' : 'var(--danger)', letterSpacing: '-0.3px' }}>
                    {isCredit ? '+' : '-'}₦{Number(tx.amount).toLocaleString('en-NG')}
                  </p>
                  <ChevronRight size={13} color="var(--tg-theme-hint-color)" />
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
        <div className="modal-overlay" onClick={() => setFundModal(false)}>
          <div className="glass-strong modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle">
              <div className="modal-handle-bar" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={20} color="var(--success)" />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.4px' }}>Fund NGN Wallet</h3>
                <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginTop: '1px' }}>
                  {ngnWallet?.virtual_account_number
                    ? `Transfer to ${ngnWallet.virtual_bank_name} · ${ngnWallet.virtual_account_number}`
                    : 'Enter an amount to add to your wallet'}
                </p>
              </div>
            </div>

            <div className="divider" style={{ margin: '16px 0' }} />

            <input
              className="input-field"
              type="number"
              placeholder="Amount in ₦ (e.g. 10,000)"
              value={fundAmount}
              onChange={e => setFundAmount(e.target.value)}
              style={{ marginBottom: '14px', fontSize: '18px', fontWeight: 700 }}
              autoFocus
            />

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[5000, 10000, 20000, 50000].map(amt => (
                <button key={amt} className={`chip-btn ${fundAmount === String(amt) ? 'active' : ''}`}
                  onClick={() => setFundAmount(String(amt))}>
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" onClick={() => { setFundModal(false); setFundAmount(''); }} style={{ flex: 1 }}>Cancel</button>
              <button
                className="btn-success"
                style={{ flex: 2 }}
                onClick={() => fundMutation.mutate()}
                disabled={!fundAmount || parseFloat(fundAmount) <= 0 || fundMutation.isPending}
              >
                {fundMutation.isPending ? (
                  <>
                    <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Processing…
                  </>
                ) : (
                  <><Plus size={16} /> Fund Now</>
                )}
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

      {/* Send Money Modal */}
      {sendModal && (
        <div className="modal-overlay" onClick={() => setSendModal(false)}>
          <div className="glass-strong modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle">
              <div className="modal-handle-bar" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(108,92,231,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={18} color="var(--accent)" />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.4px' }}>Send Money</h3>
                <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginTop: '1px' }}>Transfer to any account</p>
              </div>
            </div>

            <div className="divider" style={{ margin: '16px 0' }} />

            <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Recipient</label>
            <input
              className="input-field"
              type="text"
              placeholder="Account number or @username"
              value={sendRecipient}
              onChange={e => setSendRecipient(e.target.value)}
              style={{ marginBottom: '14px' }}
            />

            <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Amount</label>
            <input
              className="input-field"
              type="number"
              placeholder="₦ Amount"
              value={sendAmount}
              onChange={e => setSendAmount(e.target.value)}
              style={{ marginBottom: '14px', fontSize: '18px', fontWeight: 700 }}
              autoFocus
            />

            {/* Fee breakdown */}
            {sendAmount && parseFloat(sendAmount) > 0 && (
              <div className="glass" style={{ padding: '12px 14px', marginBottom: '16px', borderRadius: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>Amount</span>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>₦{parseFloat(sendAmount).toLocaleString('en-NG')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>Transfer fee</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>Free</span>
                </div>
                <div className="divider" style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>Total</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent)' }}>₦{parseFloat(sendAmount).toLocaleString('en-NG')}</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" onClick={() => { setSendModal(false); setSendAmount(''); setSendRecipient(''); }} style={{ flex: 1 }}>Cancel</button>
              <button
                className="btn-primary"
                style={{ flex: 2 }}
                disabled={!sendAmount || !sendRecipient || parseFloat(sendAmount) <= 0}
                onClick={() => {
                  haptic('success');
                  setSendModal(false);
                  setSendAmount('');
                  setSendRecipient('');
                }}
              >
                <Send size={16} /> Send Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

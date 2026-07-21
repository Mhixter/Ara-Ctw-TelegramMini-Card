import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Eye, EyeOff, Copy, CheckCircle2, ArrowDownCircle, ArrowUpCircle,
  ChevronRight, Bell, Menu, Wallet, RefreshCw, QrCode, Building2,
  Send, CreditCard, BarChart2, ArrowRightLeft
} from 'lucide-react';
import { walletApi } from '../lib/api';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';
import TransactionReceipt from '../components/TransactionReceipt';

type Tab = 'home' | 'send' | 'cards' | 'kyc' | 'profile' | 'admin';
interface Props { user: User; onNavigate?: (tab: Tab) => void; }

type View = 'home' | 'fund';

export default function HomePage({ user, onNavigate }: Props) {
  const qc = useQueryClient();
  const { haptic } = useTelegram();
  const [view, setView]           = useState<View>('home');
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [copied, setCopied]       = useState(false);
  const [receiptTx, setReceiptTx] = useState<any | null>(null);
  const [withdrawModal, setWithdrawModal]   = useState(false);
  const [exchangeModal, setExchangeModal]   = useState(false);
  const [txModal, setTxModal]               = useState(false);
  const [menuDrawer, setMenuDrawer]         = useState(false);

  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets'], queryFn: walletApi.list, refetchInterval: 30_000,
  });
  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['transactions'], queryFn: walletApi.transactions, refetchInterval: 30_000,
  });

  const ngnWallet = wallets.find((w: any) => w.currency === 'NGN');
  const balance   = Number(ngnWallet?.balance || 0);

  function copyAccount() {
    if (!ngnWallet?.virtual_account_number) return;
    navigator.clipboard.writeText(ngnWallet.virtual_account_number).then(() => {
      setCopied(true); haptic('success'); setTimeout(() => setCopied(false), 2000);
    });
  }

  function purposeLabel(p: string) {
    const map: Record<string, string> = {
      WALLET_FUNDING: 'Wallet Funded', CARD_ISSUANCE: 'Card Issued',
      CARD_SPEND: 'Card Purchase', CARD_FUNDING: 'Card Funded',
      MERCHANT_PURCHASE: 'Purchase', FEE_CHARGE: 'Fee',
      P2P_SEND: 'Sent to User', P2P_RECEIVE: 'Received',
    };
    return map[p] || p;
  }

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening';
  })();

  // ── Fund Wallet sub-view ─────────────────────────────────────────────────
  if (view === 'fund') {
    const fundingTxs = transactions.filter((t: any) => t.purpose === 'WALLET_FUNDING');
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '100px' }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px',
        }}>
          <button onClick={() => setView('home')} className="icon-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="var(--text)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text)' }}>Fund Wallet</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Add money to your wallet</p>
          </div>
        </div>

        {/* Balance card */}
        <div style={{ padding: '0 20px', marginBottom: '20px' }}>
          <div style={{
            borderRadius: '24px', padding: '24px',
            background: 'linear-gradient(135deg, #6C5CE7 0%, #8B5CF6 60%, #A78BFA 100%)',
            color: '#fff', position: 'relative', overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(108,92,231,0.4)',
          }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', bottom: -30, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
            <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '6px' }}>Your Wallet Balance</p>
            <h2 style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-1.5px' }}>
              {balanceHidden ? '₦ ••••••' : `₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`}
            </h2>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {/* Virtual Account Details */}
          {ngnWallet?.virtual_account_number ? (
            <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Virtual Account Details</h3>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--emerald)', background: 'rgba(34,197,94,0.1)', padding: '3px 10px', borderRadius: '20px' }}>● Active</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Fund your wallet using your unique virtual account</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={18} color="var(--purple)" />
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 800 }}>{ngnWallet.virtual_bank_name || 'Your Bank'}</p>
                      <span style={{ fontSize: '10px', background: 'rgba(108,92,231,0.1)', color: 'var(--purple)', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>Recommended</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Account Number</p>
                  <p style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '2px', color: 'var(--text)' }}>
                    {ngnWallet.virtual_account_number}
                  </p>
                  <button onClick={copyAccount} style={{
                    display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px',
                    background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    color: copied ? 'var(--emerald)' : 'var(--purple)', fontSize: '13px', fontWeight: 700, padding: 0,
                  }}>
                    {copied ? <><CheckCircle2 size={14} /> Copied!</> : <><Copy size={14} /> Copy account number</>}
                  </button>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '72px', height: '72px', background: 'var(--surface-2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QrCode size={36} color="var(--text-muted)" />
                  </div>
                  <p style={{ fontSize: '10px', color: 'var(--text-hint)', marginTop: '4px' }}>Scan to pay</p>
                </div>
              </div>
              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(34,197,94,0.06)', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.15)' }}>
                <p style={{ fontSize: '12px', color: 'var(--emerald)', fontWeight: 600 }}>
                  ✓ Transfer only from your registered bank account — funds credited automatically
                </p>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>No Virtual Account Yet</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Complete KYC verification to receive your dedicated bank account number.</p>
            </div>
          )}

          {/* Other funding methods */}
          <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontSize: '15px', fontWeight: 800, marginBottom: '16px' }}>Other Funding Methods</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {[
                { icon: '🏦', label: 'Bank Transfer', sub: 'Popular' },
                { icon: '💳', label: 'Card Deposit', sub: null },
                { icon: '₿', label: 'Crypto', sub: null },
                { icon: '  ', label: 'Apple Pay', sub: null },
                { icon: 'G', label: 'Google Pay', sub: null },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', fontSize: '20px', boxShadow: 'var(--shadow-xs)' }}>
                    {m.icon}
                  </div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1.2 }}>{m.label}</p>
                  {m.sub && <span style={{ fontSize: '9px', color: 'var(--purple)', fontWeight: 700 }}>{m.sub}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Recent funding transactions */}
          {fundingTxs.length > 0 && (
            <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ fontSize: '15px', fontWeight: 800 }}>Recent Funding</p>
                <span style={{ fontSize: '12px', color: 'var(--purple)', fontWeight: 700 }}>View All →</span>
              </div>
              {fundingTxs.slice(0, 5).map((tx: any) => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-sm)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={18} color="var(--emerald)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 700 }}>Bank Transfer</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--emerald)' }}>+₦{Number(tx.amount).toLocaleString('en-NG')}</p>
                  <span style={{ fontSize: '11px', color: 'var(--emerald)', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>Completed</span>
                </div>
              ))}
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-hint)', marginTop: '20px' }}>
            🔒 All transactions are encrypted and secure
          </p>
        </div>
      </div>
    );
  }

  // ── Main home view ───────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="avatar" style={{ width: 44, height: 44, fontSize: 16 }}>
            {(user.firstName?.[0] || user.username?.[0] || 'B').toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{greet} 👋</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1 style={{ fontSize: '17px', fontWeight: 900, color: 'var(--text)' }}>
                {user.firstName || user.username || 'Welcome'}
              </h1>
              {user.kycStatus !== 'PENDING' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#6C5CE7"/>
                  <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="icon-btn" style={{ position: 'relative' }} onClick={() => qc.invalidateQueries()}>
            <Bell size={18} color="var(--text-muted)" />
          </button>
          <button className="icon-btn" onClick={() => setMenuDrawer(true)}>
            <Menu size={18} color="var(--text-muted)" />
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div style={{ padding: '0 20px', marginBottom: '20px' }}>
        <div style={{
          borderRadius: '24px', padding: '24px',
          background: 'linear-gradient(135deg, #5548c8 0%, #6C5CE7 45%, #8B5CF6 100%)',
          color: '#fff', position: 'relative', overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(108,92,231,0.45)',
        }}>
          {/* Background circles */}
          <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          {/* Globe icon */}
          <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', opacity: 0.12 }}>
            <svg width="100" height="100" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1"/>
              <ellipse cx="12" cy="12" rx="4" ry="10" stroke="white" strokeWidth="1"/>
              <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="white" strokeWidth="1"/>
            </svg>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <p style={{ fontSize: '12px', opacity: 0.8, fontWeight: 600 }}>Total Wallet Balance</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => setBalanceHidden(!balanceHidden)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', opacity: 0.8, padding: 0 }}>
                  {balanceHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(34,197,94,0.25)', color: '#7fffc4', padding: '2px 10px', borderRadius: '20px' }}>● Active</span>
              </div>
            </div>
            <h2 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '4px' }}>
              {balanceHidden ? '₦ ••••••' : `₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`}
            </h2>

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', marginTop: '16px' }}>
              <button
                onClick={() => setView('fund')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: '13px',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'background 0.18s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
                Add Funds
              </button>
              <button
                onClick={() => onNavigate?.('send')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: '13px',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'background 0.18s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Send Money
              </button>
            </div>

            {/* Virtual account */}
            {ngnWallet?.virtual_account_number && (
              <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={16} color="white" />
                  </div>
                  <div>
                    <p style={{ fontSize: '10px', opacity: 0.7, marginBottom: '1px' }}>Linked Virtual Account</p>
                    <p style={{ fontSize: '13px', fontWeight: 800 }}>{ngnWallet.virtual_bank_name || 'Your Bank'}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '10px', opacity: 0.7, marginBottom: '1px' }}>Account Number</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.5px' }}>{ngnWallet.virtual_account_number}</p>
                    <button onClick={copyAccount} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#7fffc4' : 'rgba(255,255,255,0.7)', padding: 0 }}>
                      {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '0 20px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <div className="quick-grid">
            {[
              { icon: <Wallet size={20} color="var(--purple)" />, label: 'Fund\nWallet', action: () => setView('fund'), bg: 'rgba(108,92,231,0.1)' },
              { icon: <ArrowUpCircle size={20} color="#EF4444" />, label: 'With-\ndraw', action: () => setWithdrawModal(true), bg: 'rgba(239,68,68,0.1)' },
              { icon: <Send size={20} color="var(--purple)" />, label: 'Send\nMoney', action: () => onNavigate?.('send'), bg: 'rgba(108,92,231,0.1)' },
              { icon: <ArrowRightLeft size={20} color="var(--gold-dark)" />, label: 'Exchange\nCurrency', action: () => setExchangeModal(true), bg: 'rgba(244,180,0,0.1)' },
              { icon: <CreditCard size={20} color="var(--emerald)" />, label: 'Virtual\nCards', action: () => onNavigate?.('cards'), bg: 'rgba(34,197,94,0.1)' },
              { icon: <BarChart2 size={20} color="#8B5CF6" />, label: 'Trans-\nactions', action: () => setTxModal(true), bg: 'rgba(139,92,246,0.1)' },
            ].map((qa, i) => (
              <div key={i} className="quick-action" onClick={qa.action}>
                <div className="quick-icon" style={{ background: qa.bg }}>
                  {qa.icon}
                </div>
                <span className="quick-label">{qa.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Overview */}
      <div style={{ padding: '0 20px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', fontWeight: 800 }}>Analytics Overview</p>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>This Month ▾</span>
          </div>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
            {(() => {
              const income = transactions.filter((t: any) => t.credit_wallet_id).reduce((s: number, t: any) => s + Number(t.amount), 0);
              const expense = transactions.filter((t: any) => !t.credit_wallet_id).reduce((s: number, t: any) => s + Number(t.amount), 0);
              return [
                { dot: 'var(--emerald)', label: 'Total Income', value: `₦${income.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`, change: '+18.6%', up: true },
                { dot: 'var(--purple)', label: 'Total Expenses', value: `₦${expense.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`, change: '-7.3%', up: false },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.dot }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</span>
                  </div>
                  <p style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text)' }}>{s.value}</p>
                  <p style={{ fontSize: '11px', color: s.up ? 'var(--emerald)' : 'var(--danger)', fontWeight: 700 }}>{s.change} vs last month</p>
                </div>
              ));
            })()}
          </div>
          {/* Mini chart */}
          <div style={{ height: '64px', position: 'relative', overflow: 'hidden' }}>
            <svg width="100%" height="64" viewBox="0 0 300 64" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6C5CE7" stopOpacity="0.15"/>
                  <stop offset="100%" stopColor="#6C5CE7" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M0 50 C30 45 50 30 80 35 C110 40 130 20 160 18 C190 16 210 28 240 22 C270 16 290 8 300 5" fill="none" stroke="#6C5CE7" strokeWidth="2.5"/>
              <path d="M0 50 C30 45 50 30 80 35 C110 40 130 20 160 18 C190 16 210 28 240 22 C270 16 290 8 300 5 L300 64 L0 64 Z" fill="url(#chartGrad)"/>
              <path d="M0 40 C30 42 50 45 80 42 C110 39 130 38 160 40 C190 42 210 38 240 36 C270 34 290 35 300 33" fill="none" stroke="var(--emerald)" strokeWidth="2" strokeDasharray="4 2" opacity="0.6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 className="section-title">Recent Transactions</h2>
          <span style={{ fontSize: '12px', color: 'var(--purple)', fontWeight: 700 }}>View All →</span>
        </div>

        {txLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '68px', borderRadius: '16px' }} />)}
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '40px 24px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💸</div>
            <p style={{ fontWeight: 700, marginBottom: '4px' }}>No transactions yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Add money to get started</p>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', borderRadius: '20px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            {transactions.slice(0, 8).map((tx: any, idx: number) => {
              const isCredit = !!tx.credit_wallet_id;
              const meta = (() => { try { return JSON.parse(tx.metadata || '{}'); } catch { return {}; } })();
              return (
                <div
                  key={tx.id}
                  onClick={() => setReceiptTx(tx)}
                  style={{
                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                    cursor: 'pointer', borderBottom: idx < Math.min(transactions.length, 8) - 1 ? '1px solid var(--border-sm)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '14px', flexShrink: 0,
                    background: isCredit ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isCredit
                      ? <ArrowDownCircle size={20} color="var(--emerald)" />
                      : <ArrowUpCircle  size={20} color="var(--danger)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>{purposeLabel(tx.purpose)}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {meta.merchant || meta.recipientName ? `To ${meta.recipientName}` : meta.senderName ? `From ${meta.senderName}` : new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: isCredit ? 'var(--emerald)' : 'var(--danger)' }}>
                      {isCredit ? '+' : '-'}₦{Number(tx.amount).toLocaleString('en-NG')}
                    </p>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--emerald)', background: 'rgba(34,197,94,0.1)', padding: '1px 7px', borderRadius: '8px' }}>Completed</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-hint)', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4M12 2L3 6.5V12c0 5 3.8 9.7 9 11 5.2-1.3 9-6 9-11V6.5L12 2z" stroke="#22C55E" strokeWidth="2"/></svg>
          All transactions are encrypted and secure
        </p>
      </div>

      {receiptTx && <TransactionReceipt tx={receiptTx} onClose={() => setReceiptTx(null)} />}

      {/* Withdraw modal */}
      {withdrawModal && (
        <div className="modal-centre">
          <div className="modal-centre-card">
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ArrowUpCircle size={28} color="var(--danger)" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '8px' }}>Withdraw Funds</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.6 }}>
              Direct bank withdrawals are coming soon. Currently you can send money to other BorderPay users instantly.
            </p>
            <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(108,92,231,0.07)', border: '1px solid rgba(108,92,231,0.18)', marginBottom: '24px' }}>
              <p style={{ fontSize: '13px', color: 'var(--purple)', fontWeight: 600 }}>
                💡 Use <strong>Send Money</strong> to transfer NGN to any BorderPay user by their Telegram username — zero fees, instant delivery.
              </p>
            </div>
            <button className="btn-primary" onClick={() => { setWithdrawModal(false); onNavigate?.('send'); }}>
              Send to a User Instead
            </button>
            <button className="btn-ghost" onClick={() => setWithdrawModal(false)} style={{ marginTop: '10px' }}>Close</button>
          </div>
        </div>
      )}

      {/* Exchange modal */}
      {exchangeModal && (
        <div className="modal-centre">
          <div className="modal-centre-card">
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(244,180,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ArrowRightLeft size={28} color="var(--gold-dark)" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '8px' }}>Currency Exchange</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
              Multi-currency exchange is coming soon. We're integrating real-time FX rates for NGN ↔ USD, GBP, EUR, and more.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
              {['NGN ↔ USD', 'NGN ↔ GBP', 'NGN ↔ EUR', 'NGN ↔ USDT'].map(p => (
                <span key={p} style={{ fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '20px', background: 'rgba(244,180,0,0.1)', color: 'var(--gold-dark)', border: '1px solid rgba(244,180,0,0.25)' }}>{p}</span>
              ))}
            </div>
            <button className="btn-ghost" onClick={() => setExchangeModal(false)}>Got it</button>
          </div>
        </div>
      )}

      {/* All Transactions modal */}
      {txModal && (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
          <div className="modal-sheet" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-drag" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 900 }}>All Transactions</h3>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>{transactions.length} total</span>
            </div>
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>💸</div>
                <p style={{ fontWeight: 700 }}>No transactions yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {transactions.map((tx: any) => {
                  const isCredit = !!tx.credit_wallet_id;
                  const meta = (() => { try { return JSON.parse(tx.metadata || '{}'); } catch { return {}; } })();
                  return (
                    <div
                      key={tx.id}
                      onClick={() => { setTxModal(false); setReceiptTx(tx); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-sm)', cursor: 'pointer' }}
                    >
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, background: isCredit ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isCredit ? <ArrowDownCircle size={18} color="var(--emerald)" /> : <ArrowUpCircle size={18} color="var(--danger)" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>{purposeLabel(tx.purpose)}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {meta.recipientName ? `To ${meta.recipientName}` : meta.senderName ? `From ${meta.senderName}` : new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 800, color: isCredit ? 'var(--emerald)' : 'var(--danger)', flexShrink: 0 }}>
                        {isCredit ? '+' : '-'}₦{Number(tx.amount).toLocaleString('en-NG')}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            <button className="btn-ghost" onClick={() => setTxModal(false)} style={{ marginTop: '16px' }}>Close</button>
          </div>
        </div>
      )}

      {/* Menu drawer */}
      {menuDrawer && (
        <div className="modal-overlay" onClick={() => setMenuDrawer(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ paddingBottom: '32px' }}>
            <div className="modal-drag" />
            <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '20px' }}>Quick Navigation</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { emoji: '🏠', label: 'Home',            action: () => setMenuDrawer(false) },
                { emoji: '➕', label: 'Add Funds',       action: () => { setMenuDrawer(false); setView('fund'); } },
                { emoji: '📤', label: 'Send Money',      action: () => { setMenuDrawer(false); onNavigate?.('send'); } },
                { emoji: '💳', label: 'Virtual Cards',   action: () => { setMenuDrawer(false); onNavigate?.('cards'); } },
                { emoji: '🔄', label: 'All Transactions',action: () => { setMenuDrawer(false); setTxModal(true); } },
                { emoji: '👤', label: 'Profile',         action: () => { setMenuDrawer(false); onNavigate?.('profile'); } },
              ].map(item => (
                <button key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', borderRadius: '14px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'inherit', color: 'var(--text)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: '22px', width: '28px', textAlign: 'center' }}>{item.emoji}</span>
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

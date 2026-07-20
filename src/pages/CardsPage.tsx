import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Snowflake, Zap, SlidersHorizontal, AlertCircle, ShoppingBag,
  Eye, EyeOff, Copy, CheckCircle2, ChevronRight, MoreVertical,
  Wallet, Trash2, Tag, Bell
} from 'lucide-react';
import { cardsApi } from '../lib/api';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';

interface Props { user: User; }

const SAMPLE_MERCHANTS = ['Netflix', 'Spotify', 'Amazon', 'Apple', 'Google Play', 'Jumia', 'Konga', 'Uber'];

function VirtualCardVisual({ card, masked = true }: { card: any; masked?: boolean }) {
  const pan: string = card.masked_pan || card.pan || '•••• •••• •••• 0000';
  const last4 = pan.replace(/\D/g, '').slice(-4) || '0000';
  const cardholder = card.cardholder_name || 'CARDHOLDER';
  const expiry = card.expiry || '00/00';
  const brand = (card.brand || card.card_brand || 'VISA').toUpperCase();
  const isActive = card.status === 'ACTIVE';

  const gradients: Record<string, string> = {
    VISA: 'linear-gradient(135deg, #3730A3 0%, #6C5CE7 55%, #8B5CF6 100%)',
    MASTERCARD: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 55%, #4a4a6a 100%)',
    GOLD: 'linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)',
  };
  const gradient = card.card_tier === 'GOLD' ? gradients.GOLD : gradients[brand] || gradients.VISA;

  return (
    <div style={{
      width: '100%', height: '180px', borderRadius: '20px',
      background: gradient, position: 'relative', overflow: 'hidden',
      padding: '20px', color: '#fff', boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
      cursor: 'pointer', transition: 'transform 0.2s',
    }}>
      {/* Background circles */}
      <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ position: 'absolute', bottom: -30, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 900, letterSpacing: '-0.5px' }}>B</div>
            <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '-0.2px' }}>BorderPay</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, background: isActive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)', color: isActive ? '#7fffc4' : '#ffaaaa', padding: '2px 8px', borderRadius: '10px' }}>
              ● {card.status || 'ACTIVE'}
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M1 4C1 3 2 2 3 2h18c1 0 2 1 2 2v16c0 1-1 2-2 2H3c-1 0-2-1-2-2V4z" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/><circle cx="6" cy="12" r="2" fill="rgba(255,255,255,0.4)"/><circle cx="12" cy="12" r="2" fill="rgba(255,255,255,0.4)"/></svg>
          </div>
        </div>
        {/* Chip */}
        <div style={{ width: '36px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #d4a843, #f4c842)', border: '1px solid rgba(255,255,255,0.3)' }} />
        {/* PAN */}
        <div>
          <p style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '3px', marginBottom: '8px', fontFamily: 'monospace' }}>
            {masked ? `•••• •••• •••• ${last4}` : pan}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ fontSize: '9px', opacity: 0.7, marginBottom: '2px', letterSpacing: '0.5px' }}>VALID THRU</p>
              <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1px' }}>{expiry}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '9px', opacity: 0.7, marginBottom: '2px' }}>CARDHOLDER</p>
              <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cardholder}</p>
            </div>
            <div>
              {brand === 'VISA' ? (
                <p style={{ fontSize: '22px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-1px' }}>VISA</p>
              ) : brand === 'MASTERCARD' ? (
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#EB001B', opacity: 0.9 }} />
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F79E1B', opacity: 0.9, marginLeft: -8 }} />
                </div>
              ) : (
                <p style={{ fontSize: '14px', fontWeight: 900 }}>{brand}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CardsPage({ user }: Props) {
  const qc = useQueryClient();
  const { haptic } = useTelegram();
  const [filter, setFilter]       = useState<'all' | 'active' | 'frozen'>('all');
  const [issueModal, setIssueModal] = useState(false);
  const [limitModal, setLimitModal] = useState<string | null>(null);
  const [spendModal, setSpendModal] = useState<any | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [issueBrand, setIssueBrand] = useState<'VISA' | 'MASTERCARD'>('VISA');
  const [issueType, setIssueType]   = useState<'Virtual' | 'Premium' | 'Business'>('Virtual');
  const [dailyLimit, setDailyLimit] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [spendAmount, setSpendAmount] = useState('');
  const [spendMerchant, setSpendMerchant] = useState(SAMPLE_MERCHANTS[0]);
  const [issueSuccess, setIssueSuccess] = useState<any | null>(null);
  const [topupModal, setTopupModal]   = useState<string | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupResult, setTopupResult] = useState<string | null>(null);

  const { data: cards = [], isLoading } = useQuery({ queryKey: ['cards'], queryFn: cardsApi.list });

  const issueMutation = useMutation({
    mutationFn: () => cardsApi.issue('NGN', issueBrand),
    onSuccess: (data) => {
      haptic('success'); setIssueModal(false);
      setIssueSuccess(data);
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => cardsApi.updateStatus(id, status),
    onSuccess: () => { haptic('success'); qc.invalidateQueries({ queryKey: ['cards'] }); }
  });

  const limitMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => cardsApi.updateLimits(id, parseFloat(dailyLimit), parseFloat(monthlyLimit)),
    onSuccess: () => { haptic('success'); setLimitModal(null); qc.invalidateQueries({ queryKey: ['cards'] }); }
  });

  const spendMutation = useMutation({
    mutationFn: () => cardsApi.spend(spendModal!.id, parseFloat(spendAmount), spendMerchant),
    onSuccess: () => {
      haptic('success'); setSpendModal(null); setSpendAmount('');
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const topupMutation = useMutation({
    mutationFn: () => cardsApi.topup(topupModal!, parseFloat(topupAmount)),
    onSuccess: (data) => {
      haptic('success');
      setTopupResult(data.message || 'Top-up successful');
      setTopupAmount('');
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const canIssue = user.kycStatus !== 'PENDING' && user.kycStatus !== 'BANNED';

  const filtered = cards.filter((c: any) => {
    if (filter === 'active')  return c.status === 'ACTIVE';
    if (filter === 'frozen')  return c.status === 'FROZEN';
    return true;
  });

  const activeCard = cards.find((c: any) => c.id === selectedCard) || cards[0];

  function fmtNGN(n: number) { return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`; }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Manage your virtual cards</p>
          <h1 style={{ fontSize: '22px', fontWeight: 900 }}>Virtual Cards</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="icon-btn"><Bell size={18} color="var(--text-muted)" /></button>
          <button className="icon-btn"><MoreVertical size={18} color="var(--text-muted)" /></button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '0 20px', marginBottom: '16px' }}>
        <div className="filter-tabs">
          {(['all', 'active', 'frozen'] as const).map(f => (
            <button key={f} className={`tab-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? '🗂 All Cards' : f === 'active' ? '● Active' : '❄ Frozen'}
            </button>
          ))}
        </div>
      </div>

      {/* Not verified */}
      {!canIssue && (
        <div style={{ margin: '0 20px 16px', padding: '16px', background: 'var(--surface)', borderRadius: '16px', display: 'flex', gap: '12px', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <AlertCircle size={28} color="var(--warning)" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 700, marginBottom: '2px' }}>KYC Required</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Complete identity verification to issue virtual cards</p>
          </div>
        </div>
      )}

      {/* Card carousel */}
      {isLoading ? (
        <div style={{ padding: '0 20px', marginBottom: '16px' }}>
          <div className="skeleton" style={{ height: '180px', borderRadius: '20px' }} />
        </div>
      ) : cards.length === 0 ? (
        <div style={{ margin: '0 20px 16px', padding: '40px 24px', background: 'var(--surface)', borderRadius: '20px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>💳</div>
          <p style={{ fontWeight: 700, marginBottom: '4px' }}>No cards yet</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Issue your first virtual card to start spending</p>
        </div>
      ) : (
        <>
          {/* Carousel */}
          <div style={{ paddingLeft: '20px', marginBottom: '16px' }}>
            <div className="card-carousel">
              {filtered.map((card: any) => (
                <div key={card.id} className="card-carousel-item" onClick={() => setSelectedCard(card.id)}>
                  <VirtualCardVisual card={card} />
                </div>
              ))}
            </div>
            {/* Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
              {filtered.map((card: any, i: number) => (
                <div key={card.id} style={{ width: i === 0 ? '20px' : '6px', height: '6px', borderRadius: '3px', background: i === 0 ? 'var(--purple)' : 'var(--border)', transition: 'width 0.2s' }} />
              ))}
            </div>
          </div>

          {/* Active card info */}
          {activeCard && (
            <div style={{ padding: '0 20px' }}>
              {/* Balance + status row */}
              <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '12px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Card Balance</p>
                    <p style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-1px' }}>{fmtNGN(Number(activeCard.balance || 0))}</p>
                  </div>
                  <span className="badge badge-success">● {activeCard.status}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Spending Limit</p>
                    <p style={{ fontSize: '13px', fontWeight: 700 }}>{fmtNGN(Number(activeCard.monthly_limit || 0))}</p>
                    <div style={{ marginTop: '4px', height: '3px', borderRadius: '2px', background: 'var(--surface-2)' }}>
                      <div style={{ height: '100%', borderRadius: '2px', background: 'var(--purple)', width: `${Math.min(100, (Number(activeCard.amount_spent_today) / Number(activeCard.daily_limit || 1)) * 100)}%` }} />
                    </div>
                    <p style={{ fontSize: '10px', color: 'var(--text-hint)', marginTop: '2px' }}>49% used</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Currency</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '13px' }}>🇳🇬</span>
                      <p style={{ fontSize: '13px', fontWeight: 700 }}>NGN ▾</p>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Status</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeCard.status === 'ACTIVE' ? 'var(--emerald)' : 'var(--danger)' }} />
                      <p style={{ fontSize: '13px', fontWeight: 700, color: activeCard.status === 'ACTIVE' ? 'var(--emerald)' : 'var(--danger)' }}>{activeCard.status}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card actions grid */}
              <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', marginBottom: '12px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {[
                    { icon: <Snowflake size={18} color={activeCard.status === 'ACTIVE' ? '#6C5CE7' : '#EF4444'} />, label: activeCard.status === 'ACTIVE' ? 'Freeze' : 'Unfreeze', bg: 'rgba(108,92,231,0.08)', action: () => statusMutation.mutate({ id: activeCard.id, status: activeCard.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE' }) },
                    { icon: <Copy size={18} color="#22C55E" />, label: 'Copy Details', bg: 'rgba(34,197,94,0.08)', action: () => {} },
                    { icon: <Wallet size={18} color="#F4B400" />, label: 'Fund Card', bg: 'rgba(244,180,0,0.08)', action: () => { setTopupModal(activeCard.id); setTopupAmount(''); setTopupResult(null); topupMutation.reset(); } },
                    { icon: <ShoppingBag size={18} color="#8B5CF6" />, label: 'Spend', bg: 'rgba(139,92,246,0.08)', action: () => { setSpendModal(activeCard); setSpendAmount(''); } },
                    { icon: <Tag size={18} color="#6C5CE7" />, label: 'Rename', bg: 'rgba(108,92,231,0.08)', action: () => {} },
                    { icon: <SlidersHorizontal size={18} color="#F59E0B" />, label: 'Card Limits', bg: 'rgba(245,158,11,0.08)', action: () => { setLimitModal(activeCard.id); setDailyLimit(String(activeCard.daily_limit)); setMonthlyLimit(String(activeCard.monthly_limit)); } },
                    { icon: <Eye size={18} color="#22C55E" />, label: 'View PIN', bg: 'rgba(34,197,94,0.08)', action: () => {} },
                    { icon: <Trash2 size={18} color="#EF4444" />, label: 'Delete', bg: 'rgba(239,68,68,0.08)', action: () => {} },
                  ].map(a => (
                    <div key={a.label} onClick={a.action} style={{ textAlign: 'center', cursor: 'pointer' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', boxShadow: 'var(--shadow-xs)' }}>{a.icon}</div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1.3 }}>{a.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* My Cards list */}
      {cards.length > 0 && (
        <div style={{ padding: '0 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800 }}>My Cards</h2>
            <span style={{ fontSize: '12px', color: 'var(--purple)', fontWeight: 700 }}>Manage All →</span>
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: '20px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            {cards.map((card: any, i: number) => {
              const pan = card.masked_pan || '•••• •••• •••• 0000';
              const last4 = pan.replace(/\D/g, '').slice(-4) || '0000';
              return (
                <div key={card.id} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: i < cards.length - 1 ? '1px solid var(--border-sm)' : 'none', cursor: 'pointer' }} onClick={() => setSelectedCard(card.id)}>
                  <div style={{ width: '52px', height: '34px', borderRadius: '8px', background: 'linear-gradient(135deg, #3730A3, #6C5CE7)', display: 'flex', alignItems: 'flex-end', padding: '4px 6px' }}>
                    <p style={{ fontSize: '8px', fontWeight: 700, color: 'white', fontFamily: 'monospace', letterSpacing: '0.5px' }}>•••• {last4}</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 700 }}>BorderPay {(card.brand || 'VISA').toUpperCase()}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>•••• •••• •••• {last4} · {card.expiry || '00/00'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '13px', fontWeight: 800 }}>{fmtNGN(Number(card.balance || 0))}</p>
                    <span className={`badge ${card.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>● {card.status}</span>
                  </div>
                  <MoreVertical size={16} color="var(--text-hint)" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create new card FAB */}
      {canIssue && (
        <button
          onClick={() => setIssueModal(true)}
          style={{
            position: 'fixed', bottom: '90px', right: '20px',
            padding: '14px 20px', borderRadius: '28px', border: 'none',
            background: 'linear-gradient(135deg, var(--purple), var(--purple-dark))',
            color: '#fff', fontWeight: 800, fontSize: '14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit',
            boxShadow: '0 8px 28px rgba(108,92,231,0.4)',
            zIndex: 90,
          }}
        >
          <Plus size={18} /> Create New Card
        </button>
      )}

      {/* Issue Card modal */}
      {issueModal && (
        <div className="modal-overlay">
          <div className="modal-sheet">
            <div className="modal-drag" />
            <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '6px' }}>Issue New Card</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Create a card tailored to your needs</p>

            <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>Card Network</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {(['VISA', 'MASTERCARD'] as const).map(b => (
                <button key={b} onClick={() => setIssueBrand(b)} style={{
                  padding: '14px', borderRadius: '14px', border: `1.5px solid ${issueBrand === b ? 'var(--purple)' : 'var(--border)'}`,
                  background: issueBrand === b ? 'rgba(108,92,231,0.08)' : 'var(--surface-2)',
                  cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                  {b === 'VISA' ? <span style={{ fontStyle: 'italic', fontWeight: 900, fontSize: '20px', color: issueBrand === 'VISA' ? 'var(--purple)' : 'var(--text)' }}>VISA</span> : (
                    <div style={{ display: 'flex' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#EB001B' }} />
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F79E1B', marginLeft: -8 }} />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>Card Type</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
              {(['Virtual', 'Premium', 'Business'] as const).map(t => (
                <button key={t} onClick={() => setIssueType(t)} style={{
                  padding: '12px 8px', borderRadius: '12px', border: `1.5px solid ${issueType === t ? 'var(--purple)' : 'var(--border)'}`,
                  background: issueType === t ? 'rgba(108,92,231,0.08)' : 'var(--surface-2)',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                }}>
                  <p style={{ fontSize: '12px', fontWeight: 800, color: issueType === t ? 'var(--purple)' : 'var(--text)' }}>{t}</p>
                  <p style={{ fontSize: '10px', color: 'var(--text-hint)' }}>{t === 'Virtual' ? 'Online use only' : t === 'Premium' ? 'Higher limits' : 'Expense control'}</p>
                </button>
              ))}
            </div>

            {issueMutation.isError && (
              <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', marginBottom: '12px' }}>
                <p style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 600 }}>
                  {(issueMutation.error as any)?.response?.data?.error || 'Failed to issue card. Check your wallet balance.'}
                </p>
              </div>
            )}
            <button className="btn-primary" onClick={() => issueMutation.mutate()} disabled={issueMutation.isPending}>
              {issueMutation.isPending ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Issuing…</> : 'Issue Card · ₦200'}
            </button>
            <button className="btn-ghost" onClick={() => setIssueModal(false)} style={{ marginTop: '10px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Card Issued success modal */}
      {issueSuccess && (
        <div className="modal-centre">
          <div className="modal-centre-card">
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={32} color="var(--emerald)" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '8px' }}>Card Issued Successfully!</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Your virtual card is ready to use</p>
            <div style={{ background: 'var(--surface-2)', borderRadius: '14px', padding: '14px', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Virtual {issueBrand} Card</p>
              <p style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px' }}>•••• •••• •••• {Math.floor(Math.random() * 9000 + 1000)}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button className="btn-ghost" style={{ fontSize: '13px' }} onClick={() => setIssueSuccess(null)}>View Card Details</button>
              <button className="btn-primary" style={{ fontSize: '13px' }} onClick={() => setIssueSuccess(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Spend modal */}
      {spendModal && (
        <div className="modal-overlay">
          <div className="modal-sheet">
            <div className="modal-drag" />
            <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '6px' }}>Simulate Purchase</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Test your card with a simulated transaction</p>
            <select className="input-field" value={spendMerchant} onChange={e => setSpendMerchant(e.target.value)} style={{ marginBottom: '12px' }}>
              {SAMPLE_MERCHANTS.map(m => <option key={m}>{m}</option>)}
            </select>
            <input className="input-field" type="number" placeholder="Amount (₦)" value={spendAmount} onChange={e => setSpendAmount(e.target.value)} style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 800 }} autoFocus />
            {spendMutation.isError && (
              <p style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '12px', fontWeight: 600 }}>
                {(spendMutation.error as any)?.response?.data?.error || 'Purchase failed.'}
              </p>
            )}
            <button className="btn-primary" onClick={() => spendMutation.mutate()} disabled={!spendAmount || spendMutation.isPending}>
              {spendMutation.isPending ? 'Processing…' : 'Simulate Purchase'}
            </button>
            <button className="btn-ghost" onClick={() => setSpendModal(null)} style={{ marginTop: '10px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Limits modal */}
      {limitModal && (
        <div className="modal-overlay">
          <div className="modal-sheet">
            <div className="modal-drag" />
            <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '20px' }}>Update Spending Limits</h3>
            <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Daily Limit (₦)</label>
            <input className="input-field" type="number" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} style={{ marginBottom: '14px' }} />
            <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Monthly Limit (₦)</label>
            <input className="input-field" type="number" value={monthlyLimit} onChange={e => setMonthlyLimit(e.target.value)} style={{ marginBottom: '20px' }} />
            <button className="btn-primary" onClick={() => limitMutation.mutate({ id: limitModal })} disabled={!dailyLimit || !monthlyLimit || limitMutation.isPending}>
              {limitMutation.isPending ? 'Saving…' : 'Save Limits'}
            </button>
            <button className="btn-ghost" onClick={() => setLimitModal(null)} style={{ marginTop: '10px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Fund Card (top-up) modal */}
      {topupModal && (
        <div className="modal-overlay">
          <div className="modal-sheet">
            <div className="modal-drag" />
            {topupResult ? (
              <>
                <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <CheckCircle2 size={28} color="var(--emerald)" />
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '6px' }}>Card Funded!</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{topupResult}</p>
                </div>
                <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => { setTopupModal(null); setTopupResult(null); }}>Done</button>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '6px' }}>Fund Card</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Add money from your wallet to this card</p>
                <input
                  className="input-field"
                  type="number"
                  placeholder="Amount (₦)"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  style={{ marginBottom: '8px', fontSize: '20px', fontWeight: 800 }}
                  autoFocus
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>Minimum ₦100 · Debited instantly from your wallet</p>
                {topupMutation.isError && (
                  <p style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '12px', fontWeight: 600 }}>
                    {(topupMutation.error as any)?.response?.data?.error || 'Top-up failed. Please try again.'}
                  </p>
                )}
                <button
                  className="btn-primary"
                  onClick={() => topupMutation.mutate()}
                  disabled={!topupAmount || parseFloat(topupAmount) < 100 || topupMutation.isPending}
                >
                  {topupMutation.isPending ? 'Processing…' : `Fund ₦${parseFloat(topupAmount || '0').toLocaleString('en-NG')}`}
                </button>
                <button className="btn-ghost" onClick={() => setTopupModal(null)} style={{ marginTop: '10px' }}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

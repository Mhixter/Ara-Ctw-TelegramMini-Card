import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Snowflake, Zap, SlidersHorizontal, AlertCircle, ShoppingBag, Eye, EyeOff, Copy, CheckCircle2 } from 'lucide-react';
import { cardsApi } from '../lib/api';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';
import VirtualCard from '../components/VirtualCard';

interface Props { user: User; }

const SAMPLE_MERCHANTS = [
  'Netflix', 'Spotify', 'Amazon', 'Apple', 'Google Play',
  'Jumia', 'Konga', 'Shopify Store', 'Uber', 'Bolt'
];

export default function CardsPage({ user }: Props) {
  const qc = useQueryClient();
  const { haptic } = useTelegram();
  const [issueModal, setIssueModal] = useState(false);
  const [limitModal, setLimitModal] = useState<string | null>(null);
  const [spendModal, setSpendModal] = useState<any | null>(null);
  const [detailsCardId, setDetailsCardId] = useState<string | null>(null);
  const [issueBrand, setIssueBrand] = useState<'VISA' | 'MASTERCARD'>('VISA');
  const [dailyLimit, setDailyLimit] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [spendAmount, setSpendAmount] = useState('');
  const [spendMerchant, setSpendMerchant] = useState(SAMPLE_MERCHANTS[0]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: cardsApi.list
  });

  const issueMutation = useMutation({
    mutationFn: () => cardsApi.issue('NGN', issueBrand),
    onSuccess: () => {
      haptic('success');
      setIssueModal(false);
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
      haptic('success');
      setSpendModal(null);
      setSpendAmount('');
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const canIssue = user.kycStatus !== 'PENDING' && user.kycStatus !== 'BANNED';
  const maxTier = user.kycStatus === 'TIER_2' ? 'PLATINUM' : user.kycStatus === 'TIER_1' ? 'GOLD' : null;

  const { data: cardDetails, isLoading: detailsLoading, error: detailsError } = useQuery({
    queryKey: ['card-details', detailsCardId],
    queryFn: () => cardsApi.details(detailsCardId!),
    enabled: !!detailsCardId,
    staleTime: 0,
    retry: false,
  });

  function copyField(value: string, field: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    });
  }

  function fmtNGN(n: number) {
    return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
  }

  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const activeCard = cards[activeCardIdx] || null;

  return (
    <div className="page" style={{ paddingTop: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '2px' }}>Virtual Cards</p>
          <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>My Cards</h1>
        </div>
        {maxTier && (
          <span className={`badge ${maxTier === 'PLATINUM' ? 'badge-platinum' : 'badge-gold'}`}>
            {maxTier}
          </span>
        )}
      </div>

      {/* Not verified */}
      {!canIssue && (
        <div className="glass" style={{ padding: '20px', marginBottom: '20px', borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.05)', textAlign: 'center', borderRadius: '20px' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔒</div>
          <p style={{ fontWeight: 700, marginBottom: '4px' }}>KYC Required</p>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>
            Complete identity verification to issue virtual cards
          </p>
        </div>
      )}

      {/* Cards Carousel */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="skeleton" style={{ height: '200px', borderRadius: '24px' }} />
          <div className="skeleton" style={{ height: '120px', borderRadius: '20px' }} />
        </div>
      ) : cards.length === 0 ? (
        <div className="glass" style={{ padding: '44px 24px', textAlign: 'center', marginBottom: '20px', borderRadius: '24px' }}>
          <div style={{ fontSize: '52px', marginBottom: '14px' }}>💳</div>
          <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '5px' }}>No cards yet</p>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>
            Issue your first virtual card to start spending globally
          </p>
        </div>
      ) : (
        <>
          {/* Horizontal scroll carousel */}
          <div className="cards-scroll" style={{ marginLeft: '-16px', marginRight: '-16px', paddingLeft: '16px', paddingRight: '16px' }}>
            {cards.map((card: any, idx: number) => (
              <div
                key={card.id}
                onClick={() => setActiveCardIdx(idx)}
                style={{
                  width: 'calc(100vw - 48px)', maxWidth: '380px',
                  cursor: 'pointer',
                  transform: activeCardIdx === idx ? 'scale(1)' : 'scale(0.96)',
                  transition: 'transform 0.25s ease',
                  opacity: activeCardIdx === idx ? 1 : 0.7,
                }}
              >
                <VirtualCard card={card} />
              </div>
            ))}
          </div>

          {/* Dots */}
          {cards.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '4px', marginBottom: '16px' }}>
              {cards.map((_: any, i: number) => (
                <div key={i} style={{
                  width: activeCardIdx === i ? '20px' : '6px', height: '6px',
                  borderRadius: '3px',
                  background: activeCardIdx === i ? 'var(--accent)' : 'var(--glass-border)',
                  transition: 'all 0.25s ease', cursor: 'pointer',
                }} onClick={() => setActiveCardIdx(i)} />
              ))}
            </div>
          )}

          {/* Active Card Details */}
          {activeCard && (() => {
            const spentToday = Number(activeCard.amount_spent_today || 0);
            const daily = Number(activeCard.daily_limit);
            const pct = Math.min(100, daily > 0 ? (spentToday / daily) * 100 : 0);
            const remaining = daily - spentToday;
            return (
              <div className="glass" style={{ padding: '18px', borderRadius: '22px', marginBottom: '14px' }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ textAlign: 'center', padding: '10px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <p style={{ fontSize: '12px', fontWeight: 800, marginBottom: '2px' }}>{fmtNGN(daily)}</p>
                    <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)' }}>Daily Limit</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <p style={{ fontSize: '12px', fontWeight: 800, marginBottom: '2px' }}>{fmtNGN(remaining)}</p>
                    <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)' }}>Remaining</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <span className={`badge ${activeCard.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>{activeCard.status}</span>
                    <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', marginTop: '4px' }}>Status</p>
                  </div>
                </div>

                {/* Spend progress */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>Daily usage</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: pct > 80 ? 'var(--danger)' : 'var(--tg-theme-hint-color)' }}>
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'var(--glass-border)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '3px',
                      background: pct > 80 ? 'var(--danger)'
                        : activeCard.card_tier === 'GOLD'
                          ? 'linear-gradient(90deg, var(--gold-dark), var(--gold))'
                          : 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                      width: `${pct}%`, transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>

                {/* Actions grid - 2x2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    className="btn-ghost"
                    style={{ padding: '11px', fontSize: '12px', gap: '6px', borderRadius: '14px' }}
                    onClick={() => statusMutation.mutate({ id: activeCard.id, status: activeCard.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE' })}
                    disabled={statusMutation.isPending}
                  >
                    {activeCard.status === 'ACTIVE' ? <><Snowflake size={14} /> Freeze</> : <><Zap size={14} /> Unfreeze</>}
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ padding: '11px', fontSize: '12px', gap: '6px', borderRadius: '14px' }}
                    onClick={() => { setLimitModal(activeCard.id); setDailyLimit(String(activeCard.daily_limit)); setMonthlyLimit(String(activeCard.monthly_limit)); }}
                  >
                    <SlidersHorizontal size={14} /> Limits
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ padding: '11px', fontSize: '12px', gap: '6px', borderRadius: '14px', borderColor: 'rgba(108,92,231,0.3)', opacity: activeCard.status !== 'ACTIVE' ? 0.4 : 1 }}
                    onClick={() => { setSpendModal(activeCard); setSpendAmount(''); setSpendMerchant(SAMPLE_MERCHANTS[0]); }}
                    disabled={activeCard.status !== 'ACTIVE'}
                  >
                    <ShoppingBag size={14} /> Spend
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ padding: '11px', fontSize: '12px', gap: '6px', borderRadius: '14px', borderColor: 'rgba(244,180,0,0.3)' }}
                    onClick={() => setDetailsCardId(activeCard.id)}
                  >
                    <Eye size={14} /> Details
                  </button>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* Issue Card FAB */}
      {canIssue && (
        <button className="btn-gold" style={{ marginTop: '8px', borderRadius: '18px' }} onClick={() => setIssueModal(true)}>
          <Plus size={18} /> Issue New Card
        </button>
      )}

      {/* ── Card Details Modal ── */}
      {detailsCardId && (
        <div className="modal-overlay" onClick={() => setDetailsCardId(null)}>
          <div className="glass-strong modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"><div className="modal-handle-bar" /></div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '4px', letterSpacing: '-0.3px' }}>Card Details</h3>
            <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '18px' }}>
              🔒 Sensitive — do not share with anyone
            </p>

            {detailsLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 10 }} />)}
              </div>
            )}
            {detailsError && (
              <div className="glass" style={{ padding: '14px 16px', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', borderRadius: '14px' }}>
                <p style={{ fontSize: 13, color: 'var(--danger)' }}>
                  {(detailsError as any)?.response?.data?.error || 'Failed to load card details.'}
                </p>
              </div>
            )}
            {cardDetails && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Card Number', field: 'pan', value: cardDetails.maskPan },
                  { label: 'CVV', field: 'cvv', value: cardDetails.cvv || '***' },
                  { label: 'Expiry', field: 'expiry', value: cardDetails.expiry },
                  { label: 'Network', field: 'brand', value: cardDetails.brand },
                  { label: 'Tier', field: 'tier', value: cardDetails.tier },
                  ...(cardDetails.billingAddress ? [{ label: 'Billing Address', field: 'billing', value: cardDetails.billingAddress }] : []),
                ].map(({ label, field, value }) => (
                  <div key={field} className="glass" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '14px' }}>
                    <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', fontWeight: 500 }}>{label}</span>
                    <button
                      onClick={() => copyField(value, field)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: copiedField === field ? 'var(--success)' : 'var(--tg-theme-text-color)', fontSize: 13, fontWeight: 700, padding: 0, fontFamily: 'inherit' }}
                    >
                      <span style={{ fontFamily: field === 'pan' || field === 'cvv' ? '"Courier New", monospace' : 'inherit', letterSpacing: field === 'pan' ? '1.5px' : 'normal' }}>{value}</span>
                      {copiedField === field ? <CheckCircle2 size={14} color="var(--success)" /> : <Copy size={13} color="var(--tg-theme-hint-color)" />}
                    </button>
                  </div>
                ))}

                <div style={{ marginTop: 4, padding: '10px 14px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <p style={{ fontSize: 11, color: 'var(--warning)' }}>⚠️ CVV is shown once and never stored. Screenshot this page if needed.</p>
                </div>
              </div>
            )}
            <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => setDetailsCardId(null)}>Close</button>
          </div>
        </div>
      )}

      {/* ── Issue Modal with Live Preview ── */}
      {issueModal && (
        <div className="modal-overlay" onClick={() => setIssueModal(false)}>
          <div className="glass-strong modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"><div className="modal-handle-bar" /></div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px', letterSpacing: '-0.4px' }}>Issue Virtual Card</h3>
            <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '16px' }}>
              Issuance fee: ₦5,000 · Tier: <strong style={{ color: maxTier === 'PLATINUM' ? 'var(--platinum)' : 'var(--gold)' }}>{maxTier}</strong>
            </p>

            {/* Live Card Preview */}
            <div style={{ marginBottom: '18px', transform: 'scale(0.9)', transformOrigin: 'center top' }}>
              <VirtualCard card={{
                id: 'preview', mask_pan: '4000 XXXX XXXX 0000',
                card_tier: maxTier === 'PLATINUM' ? 'PLATINUM' : 'GOLD',
                card_brand: issueBrand,
                card_currency: 'NGN', daily_limit: 50000, monthly_limit: 500000,
                amount_spent_today: 0, status: 'ACTIVE',
              }} />
            </div>

            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--tg-theme-hint-color)', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Select Network</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              {(['VISA', 'MASTERCARD'] as const).map(b => (
                <button key={b} onClick={() => setIssueBrand(b)} style={{
                  flex: 1, padding: '12px 10px', borderRadius: '14px', border: '1px solid',
                  borderColor: issueBrand === b ? 'var(--gold)' : 'var(--glass-border)',
                  background: issueBrand === b ? 'rgba(244,180,0,0.08)' : 'var(--glass-bg)',
                  color: issueBrand === b ? 'var(--gold)' : 'var(--tg-theme-hint-color)',
                  fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                  {b === 'MASTERCARD' ? (
                    <div style={{ display: 'flex' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#eb001b' }} />
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#f79e1b', marginLeft: '-7px' }} />
                    </div>
                  ) : (
                    <span style={{ fontStyle: 'italic', fontWeight: 900 }}>VISA</span>
                  )}
                  {b}
                </button>
              ))}
            </div>

            {/* Fee summary */}
            <div className="glass" style={{ padding: '12px 14px', marginBottom: '18px', borderRadius: '14px', background: 'rgba(244,180,0,0.04)', borderColor: 'rgba(244,180,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>Issuance fee</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)' }}>₦5,000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>Maintenance</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>Free</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" onClick={() => setIssueModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn-gold" style={{ flex: 2, borderRadius: '16px' }} onClick={() => issueMutation.mutate()} disabled={issueMutation.isPending}>
                {issueMutation.isPending ? (
                  <><span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#1a1000', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Issuing…</>
                ) : (
                  <><Plus size={16} /> Issue Card</>
                )}
              </button>
            </div>
            {issueMutation.isError && (
              <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '10px', textAlign: 'center' }}>
                {(issueMutation.error as any)?.response?.data?.error || 'Failed. Try again.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Spend Simulation Modal ── */}
      {spendModal && (
        <div className="modal-overlay" onClick={() => { setSpendModal(null); spendMutation.reset(); }}>
          <div className="glass-strong modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"><div className="modal-handle-bar" /></div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px', letterSpacing: '-0.4px' }}>Simulate Card Spend</h3>
            <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '18px' }}>
              {spendModal.mask_pan} · {spendModal.card_tier} · {fmtNGN(Number(spendModal.daily_limit) - Number(spendModal.amount_spent_today || 0))} remaining today
            </p>

            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tg-theme-hint-color)', marginBottom: '8px', display: 'block' }}>Merchant</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {SAMPLE_MERCHANTS.map(m => (
                <button key={m} onClick={() => setSpendMerchant(m)} style={{
                  padding: '6px 12px', borderRadius: '20px', border: '1px solid',
                  borderColor: spendMerchant === m ? 'var(--accent)' : 'var(--glass-border)',
                  background: spendMerchant === m ? 'rgba(108,92,231,0.12)' : 'transparent',
                  color: spendMerchant === m ? 'var(--accent)' : 'var(--tg-theme-hint-color)',
                  fontSize: '12px', cursor: 'pointer', fontWeight: spendMerchant === m ? 700 : 500,
                  fontFamily: 'inherit',
                }}>{m}</button>
              ))}
            </div>

            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block' }}>Amount (₦)</label>
            <input
              className="input-field"
              type="number"
              placeholder="e.g. 2500"
              value={spendAmount}
              onChange={e => setSpendAmount(e.target.value)}
              style={{ marginBottom: '18px', fontSize: '18px', fontWeight: 700 }}
              autoFocus
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" onClick={() => { setSpendModal(null); spendMutation.reset(); }} style={{ flex: 1 }}>Cancel</button>
              <button
                className="btn-primary"
                style={{ flex: 2, borderRadius: '16px' }}
                onClick={() => spendMutation.mutate()}
                disabled={!spendAmount || parseFloat(spendAmount) <= 0 || spendMutation.isPending}
              >
                {spendMutation.isPending ? 'Processing…' : 'Charge Card'}
              </button>
            </div>
            {spendMutation.isError && (
              <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '10px', textAlign: 'center' }}>
                {(spendMutation.error as any)?.response?.data?.error || 'Transaction failed.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Limit Modal ── */}
      {limitModal && (
        <div className="modal-overlay" onClick={() => setLimitModal(null)}>
          <div className="glass-strong modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"><div className="modal-handle-bar" /></div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px', letterSpacing: '-0.4px' }}>Adjust Spending Limits</h3>
            <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '18px' }}>Amounts in Nigerian Naira (₦)</p>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block' }}>Daily Limit (₦)</label>
            <input className="input-field" type="number" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} style={{ marginBottom: '12px' }} />
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block' }}>Monthly Limit (₦)</label>
            <input className="input-field" type="number" value={monthlyLimit} onChange={e => setMonthlyLimit(e.target.value)} style={{ marginBottom: '18px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" onClick={() => setLimitModal(null)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn-primary" style={{ flex: 2, borderRadius: '16px' }} onClick={() => limitMutation.mutate({ id: limitModal! })} disabled={limitMutation.isPending}>
                {limitMutation.isPending ? 'Saving…' : 'Save Limits'}
              </button>
            </div>
            {limitMutation.isError && (
              <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '10px', textAlign: 'center' }}>
                {(limitMutation.error as any)?.response?.data?.error || 'Failed. Try again.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

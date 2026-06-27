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

  return (
    <div className="page" style={{ paddingTop: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>Virtual Cards</p>
          <h1 style={{ fontSize: '22px', fontWeight: 800 }}>My Cards</h1>
        </div>
        {maxTier && (
          <span className={`badge ${maxTier === 'PLATINUM' ? 'badge-platinum' : 'badge-gold'}`}>
            {maxTier}
          </span>
        )}
      </div>

      {/* Not verified */}
      {!canIssue && (
        <div className="glass" style={{ padding: '20px', marginBottom: '20px', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)', textAlign: 'center' }}>
          <AlertCircle size={32} color="var(--warning)" style={{ margin: '0 auto 10px' }} />
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>KYC Required</p>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>
            Complete identity verification to issue virtual cards
          </p>
        </div>
      )}

      {/* Cards List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: '200px', borderRadius: '20px' }} />)}
        </div>
      ) : cards.length === 0 ? (
        <div className="glass" style={{ padding: '40px 24px', textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>💳</div>
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>No cards yet</p>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>
            Issue your first virtual card to start spending
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {cards.map((card: any) => {
            const spentToday = Number(card.amount_spent_today || 0);
            const daily = Number(card.daily_limit);
            const pct = Math.min(100, daily > 0 ? (spentToday / daily) * 100 : 0);
            const remaining = daily - spentToday;

            return (
              <div key={card.id}>
                <VirtualCard card={card} />

                {/* Card Info */}
                <div className="glass" style={{ marginTop: '12px', padding: '16px' }}>
                  {/* Limits row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginBottom: '2px' }}>Daily Limit</p>
                      <p style={{ fontSize: '15px', fontWeight: 700 }}>{fmtNGN(daily)}</p>
                      <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)' }}>{fmtNGN(spentToday)} used today</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginBottom: '2px' }}>Monthly Limit</p>
                      <p style={{ fontSize: '15px', fontWeight: 700 }}>{fmtNGN(Number(card.monthly_limit))}</p>
                      <span className={`badge ${card.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{card.status}</span>
                    </div>
                  </div>

                  {/* Daily spend progress */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>Daily spending</span>
                      <span style={{ fontSize: '11px', color: pct > 80 ? 'var(--danger)' : 'var(--tg-theme-hint-color)' }}>
                        {Math.round(pct)}% · {fmtNGN(remaining)} left
                      </span>
                    </div>
                    <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '3px',
                        background: pct > 80
                          ? 'var(--danger)'
                          : card.card_tier === 'GOLD'
                            ? 'linear-gradient(90deg, var(--gold-dark), var(--gold))'
                            : 'linear-gradient(90deg, var(--accent), #8b5cf6)',
                        width: `${pct}%`,
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <button
                      className="btn-ghost"
                      style={{ padding: '10px', fontSize: '12px', gap: '6px' }}
                      onClick={() => statusMutation.mutate({ id: card.id, status: card.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE' })}
                      disabled={statusMutation.isPending}
                    >
                      {card.status === 'ACTIVE' ? <><Snowflake size={14} /> Freeze</> : <><Zap size={14} /> Unfreeze</>}
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ padding: '10px', fontSize: '12px', gap: '6px' }}
                      onClick={() => { setLimitModal(card.id); setDailyLimit(String(card.daily_limit)); setMonthlyLimit(String(card.monthly_limit)); }}
                    >
                      <SlidersHorizontal size={14} /> Limits
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      className="btn-ghost"
                      style={{ padding: '10px', fontSize: '12px', gap: '6px', borderColor: 'rgba(108,99,255,0.35)', opacity: card.status !== 'ACTIVE' ? 0.4 : 1 }}
                      onClick={() => { setSpendModal(card); setSpendAmount(''); setSpendMerchant(SAMPLE_MERCHANTS[0]); }}
                      disabled={card.status !== 'ACTIVE'}
                    >
                      <ShoppingBag size={14} /> Spend
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ padding: '10px', fontSize: '12px', gap: '6px', borderColor: 'rgba(245,185,66,0.35)' }}
                      onClick={() => setDetailsCardId(card.id)}
                    >
                      <Eye size={14} /> View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Issue Card Button */}
      {canIssue && (
        <button className="btn-gold" style={{ marginTop: '24px' }} onClick={() => setIssueModal(true)}>
          <Plus size={18} /> Issue New Card
        </button>
      )}

      {/* ── Card Details Modal ── */}
      {detailsCardId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 300 }}
          onClick={() => setDetailsCardId(null)}>
          <div className="glass-strong" style={{ width: '100%', maxWidth: '480px', padding: '28px 24px 40px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
            onClick={e => e.stopPropagation()}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: 4 }}>Card Details</h3>
            <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: 20 }}>
              Sensitive — do not share with anyone
            </p>

            {detailsLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 10 }} />)}
              </div>
            )}
            {detailsError && (
              <div className="glass" style={{ padding: '14px 16px', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                <p style={{ fontSize: 13, color: 'var(--danger)' }}>
                  {(detailsError as any)?.response?.data?.error || 'Failed to load card details.'}
                </p>
              </div>
            )}
            {cardDetails && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Card Number', field: 'pan', value: cardDetails.maskPan },
                  { label: 'CVV', field: 'cvv', value: cardDetails.cvv || '***' },
                  { label: 'Expiry', field: 'expiry', value: cardDetails.expiry },
                  { label: 'Network', field: 'brand', value: cardDetails.brand },
                  { label: 'Tier', field: 'tier', value: cardDetails.tier },
                  ...(cardDetails.billingAddress ? [{ label: 'Billing Address', field: 'billing', value: cardDetails.billingAddress }] : []),
                ].map(({ label, field, value }) => (
                  <div key={field} className="glass" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>{label}</span>
                    <button
                      onClick={() => copyField(value, field)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: copiedField === field ? 'var(--success)' : 'var(--tg-theme-text-color)', fontSize: 13, fontWeight: 600, padding: 0 }}
                    >
                      <span style={{ fontFamily: field === 'pan' || field === 'cvv' ? 'monospace' : 'inherit', letterSpacing: field === 'pan' ? '1px' : 'normal' }}>{value}</span>
                      {copiedField === field ? <CheckCircle2 size={13} color="var(--success)" /> : <Copy size={12} color="var(--tg-theme-hint-color)" />}
                    </button>
                  </div>
                ))}

                <div style={{ marginTop: 6, padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <p style={{ fontSize: 11, color: 'var(--warning)' }}>⚠️ CVV is shown once and never stored. Screenshot this page if needed.</p>
                </div>
              </div>
            )}
            <button className="btn-ghost" style={{ marginTop: 20 }} onClick={() => setDetailsCardId(null)}>Close</button>
          </div>
        </div>
      )}

      {/* ── Issue Modal ── */}
      {issueModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div className="glass-strong" style={{ width: '100%', maxWidth: '480px', padding: '28px 24px 36px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Issue Virtual Card</h3>
            <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '20px' }}>
              NGN card · Issuance fee: ₦5,000 · Tier: <strong style={{ color: maxTier === 'PLATINUM' ? 'var(--platinum)' : 'var(--gold)' }}>{maxTier}</strong>
            </p>
            <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '8px' }}>Network</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {(['VISA', 'MASTERCARD'] as const).map(b => (
                <button key={b} onClick={() => setIssueBrand(b)} style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid',
                  borderColor: issueBrand === b ? 'var(--gold)' : 'var(--glass-border)',
                  background: issueBrand === b ? 'rgba(245,185,66,0.1)' : 'transparent',
                  color: 'var(--tg-theme-text-color)', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                }}>{b}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" onClick={() => setIssueModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn-gold" style={{ flex: 1 }} onClick={() => issueMutation.mutate()} disabled={issueMutation.isPending}>
                {issueMutation.isPending ? 'Issuing...' : 'Issue Card'}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div className="glass-strong" style={{ width: '100%', maxWidth: '480px', padding: '28px 24px 36px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Simulate Card Spend</h3>
            <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '20px' }}>
              {spendModal.mask_pan} · {spendModal.card_tier} · {fmtNGN(Number(spendModal.daily_limit) - Number(spendModal.amount_spent_today || 0))} remaining today
            </p>

            <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block' }}>Merchant</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {SAMPLE_MERCHANTS.map(m => (
                <button key={m} onClick={() => setSpendMerchant(m)} style={{
                  padding: '6px 12px', borderRadius: '20px', border: '1px solid',
                  borderColor: spendMerchant === m ? 'var(--accent)' : 'var(--glass-border)',
                  background: spendMerchant === m ? 'rgba(108,99,255,0.15)' : 'transparent',
                  color: 'var(--tg-theme-text-color)', fontSize: '12px', cursor: 'pointer', fontWeight: spendMerchant === m ? 700 : 400
                }}>{m}</button>
              ))}
            </div>

            <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block' }}>Amount (₦)</label>
            <input
              className="input-field"
              type="number"
              placeholder="e.g. 2500"
              value={spendAmount}
              onChange={e => setSpendAmount(e.target.value)}
              style={{ marginBottom: '20px' }}
              autoFocus
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" onClick={() => { setSpendModal(null); spendMutation.reset(); }} style={{ flex: 1 }}>Cancel</button>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => spendMutation.mutate()}
                disabled={!spendAmount || parseFloat(spendAmount) <= 0 || spendMutation.isPending}
              >
                {spendMutation.isPending ? 'Processing...' : 'Charge Card'}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div className="glass-strong" style={{ width: '100%', maxWidth: '480px', padding: '28px 24px 36px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Adjust Spending Limits</h3>
            <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '20px' }}>Amounts in ₦</p>
            <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block' }}>Daily Limit (₦)</label>
            <input className="input-field" type="number" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} style={{ marginBottom: '14px' }} />
            <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block' }}>Monthly Limit (₦)</label>
            <input className="input-field" type="number" value={monthlyLimit} onChange={e => setMonthlyLimit(e.target.value)} style={{ marginBottom: '20px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-ghost" onClick={() => setLimitModal(null)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => limitMutation.mutate({ id: limitModal! })} disabled={limitMutation.isPending}>
                {limitMutation.isPending ? 'Saving...' : 'Save Limits'}
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

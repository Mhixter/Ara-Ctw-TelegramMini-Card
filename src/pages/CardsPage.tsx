import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Snowflake, Zap, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { cardsApi } from '../lib/api';
import { User } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';
import VirtualCard from '../components/VirtualCard';

interface Props { user: User; }

export default function CardsPage({ user }: Props) {
  const qc = useQueryClient();
  const { haptic } = useTelegram();
  const [issueModal, setIssueModal] = useState(false);
  const [limitModal, setLimitModal] = useState<string | null>(null);
  const [issueCurrency, setIssueCurrency] = useState<'USD' | 'NGN'>('USD');
  const [issueBrand, setIssueBrand] = useState<'VISA' | 'MASTERCARD'>('VISA');
  const [dailyLimit, setDailyLimit] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: cardsApi.list
  });

  const issueMutation = useMutation({
    mutationFn: () => cardsApi.issue(issueCurrency, issueBrand),
    onSuccess: () => { haptic('success'); setIssueModal(false); qc.invalidateQueries({ queryKey: ['cards'] }); qc.invalidateQueries({ queryKey: ['wallets'] }); }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => cardsApi.updateStatus(id, status),
    onSuccess: () => { haptic('success'); qc.invalidateQueries({ queryKey: ['cards'] }); }
  });

  const limitMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => cardsApi.updateLimits(id, parseFloat(dailyLimit), parseFloat(monthlyLimit)),
    onSuccess: () => { haptic('success'); setLimitModal(null); qc.invalidateQueries({ queryKey: ['cards'] }); }
  });

  const canIssue = user.kycStatus !== 'PENDING' && user.kycStatus !== 'BANNED';
  const maxTier = user.kycStatus === 'TIER_2' ? 'PLATINUM' : user.kycStatus === 'TIER_1' ? 'GOLD' : null;

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
          {cards.map((card: any) => (
            <div key={card.id}>
              <VirtualCard card={card} />

              {/* Card Info */}
              <div className="glass" style={{ marginTop: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginBottom: '2px' }}>Daily Limit</p>
                    <p style={{ fontSize: '15px', fontWeight: 700 }}>${Number(card.daily_limit).toLocaleString()}</p>
                    <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)' }}>${Number(card.amount_spent_today || 0).toFixed(2)} used today</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginBottom: '2px' }}>Monthly Limit</p>
                    <p style={{ fontSize: '15px', fontWeight: 700 }}>${Number(card.monthly_limit).toLocaleString()}</p>
                    <span className={`badge ${card.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{card.status}</span>
                  </div>
                </div>

                {/* Spending progress */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>Daily spending</span>
                    <span style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>
                      {Math.round((Number(card.amount_spent_today || 0) / Number(card.daily_limit)) * 100)}%
                    </span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '2px',
                      background: card.card_tier === 'GOLD' ? 'linear-gradient(90deg, var(--gold-dark), var(--gold))' : 'linear-gradient(90deg, var(--accent), #8b5cf6)',
                      width: `${Math.min(100, (Number(card.amount_spent_today || 0) / Number(card.daily_limit)) * 100)}%`,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-ghost"
                    style={{ flex: 1, padding: '10px', fontSize: '12px', gap: '6px' }}
                    onClick={() => statusMutation.mutate({ id: card.id, status: card.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE' })}
                    disabled={statusMutation.isPending}
                  >
                    {card.status === 'ACTIVE' ? <><Snowflake size={14} /> Freeze</> : <><Zap size={14} /> Unfreeze</>}
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ flex: 1, padding: '10px', fontSize: '12px', gap: '6px' }}
                    onClick={() => { setLimitModal(card.id); setDailyLimit(card.daily_limit); setMonthlyLimit(card.monthly_limit); }}
                  >
                    <SlidersHorizontal size={14} /> Limits
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issue Card Button */}
      {canIssue && (
        <button className="btn-gold" style={{ marginTop: '24px' }} onClick={() => setIssueModal(true)}>
          <Plus size={18} /> Issue New Card
        </button>
      )}

      {/* Issue Modal */}
      {issueModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div className="glass-strong" style={{ width: '100%', maxWidth: '480px', padding: '28px 24px 36px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Issue Virtual Card</h3>
            <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '20px' }}>
              Card issuance fee: $10. Tier: <strong style={{ color: maxTier === 'PLATINUM' ? 'var(--platinum)' : 'var(--gold)' }}>{maxTier}</strong>
            </p>

            <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '8px' }}>Currency</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['USD', 'NGN'] as const).map(c => (
                <button key={c} onClick={() => setIssueCurrency(c)} style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid',
                  borderColor: issueCurrency === c ? 'var(--gold)' : 'var(--glass-border)',
                  background: issueCurrency === c ? 'rgba(245,185,66,0.1)' : 'transparent',
                  color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                }}>{c}</button>
              ))}
            </div>

            <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '8px' }}>Network</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {(['VISA', 'MASTERCARD'] as const).map(b => (
                <button key={b} onClick={() => setIssueBrand(b)} style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid',
                  borderColor: issueBrand === b ? 'var(--gold)' : 'var(--glass-border)',
                  background: issueBrand === b ? 'rgba(245,185,66,0.1)' : 'transparent',
                  color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
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

      {/* Limit Modal */}
      {limitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div className="glass-strong" style={{ width: '100%', maxWidth: '480px', padding: '28px 24px 36px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Adjust Spending Limits</h3>
            <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block' }}>Daily Limit ($)</label>
            <input className="input-field" type="number" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} style={{ marginBottom: '14px' }} />
            <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block' }}>Monthly Limit ($)</label>
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

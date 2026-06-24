import React, { useState } from 'react';
import { Eye, EyeOff, Wifi, CreditCard, Snowflake } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

interface CardData {
  id: string;
  mask_pan: string;
  card_tier: 'GOLD' | 'PLATINUM';
  card_brand: 'VISA' | 'MASTERCARD' | 'VERVE';
  card_currency: 'NGN' | 'USD';
  daily_limit: number;
  monthly_limit: number;
  amount_spent_today: number;
  status: 'ACTIVE' | 'FROZEN' | 'TERMINATED';
}

interface Props {
  card: CardData;
  onFreeze?: (id: string) => void;
  onUnfreeze?: (id: string) => void;
}

export default function VirtualCard({ card, onFreeze, onUnfreeze }: Props) {
  const { haptic } = useTelegram();
  const [revealed, setRevealed] = useState(false);
  const isGold = card.card_tier === 'GOLD';
  const isFrozen = card.status === 'FROZEN';

  function handleReveal() {
    haptic('success');
    setRevealed(r => !r);
  }

  const pan = revealed ? card.mask_pan.replace('XXXXXX', '•• ••••') : card.mask_pan;
  const panGroups = pan.match(/.{1,4}/g) || [];

  const goldGradient = 'linear-gradient(135deg, #2d1f00 0%, #8b5e00 30%, #f5b942 60%, #ffd76e 80%, #c8881a 100%)';
  const platinumGradient = 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 30%, #2d2d4e 60%, #3d3d5e 80%, #1a1a2e 100%)';

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1.586',
        borderRadius: '20px',
        background: isGold ? goldGradient : platinumGradient,
        boxShadow: isGold
          ? '0 20px 60px rgba(245,185,66,0.3), 0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
          : '0 20px 60px rgba(108,99,255,0.2), 0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        overflow: 'hidden',
        filter: isFrozen ? 'brightness(0.6) saturate(0.4)' : 'none',
        transition: 'filter 0.3s ease',
        userSelect: 'none'
      }}
    >
      {/* Shimmer overlay */}
      {isGold && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 3s infinite',
          pointerEvents: 'none'
        }} />
      )}

      {/* Holographic overlay for Platinum */}
      {!isGold && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 30% 40%, rgba(108,99,255,0.2) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(168,178,200,0.15) 0%, transparent 60%)',
          pointerEvents: 'none'
        }} />
      )}

      {/* Frozen overlay */}
      {isFrozen && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(59,130,246,0.1)', backdropFilter: 'blur(2px)', borderRadius: '20px', zIndex: 10
        }}>
          <div style={{ textAlign: 'center', color: '#93c5fd' }}>
            <Snowflake size={40} strokeWidth={1.5} />
            <p style={{ fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>FROZEN</p>
          </div>
        </div>
      )}

      <div style={{ padding: '20px 24px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
              color: isGold ? 'rgba(255,220,80,0.9)' : 'rgba(168,178,200,0.7)', marginBottom: '2px'
            }}>
              NairaVault
            </p>
            <p style={{
              fontSize: '13px', fontWeight: 700, letterSpacing: '1px',
              color: isGold ? '#fff8e0' : 'rgba(255,255,255,0.9)'
            }}>
              {card.card_tier} · {card.card_currency}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Wifi size={18} style={{ color: isGold ? 'rgba(255,220,80,0.8)' : 'rgba(168,178,200,0.7)' }} />
          </div>
        </div>

        {/* Chip + PAN */}
        <div>
          {/* EMV Chip */}
          <div style={{
            width: '36px', height: '28px', borderRadius: '6px',
            background: isGold ? 'linear-gradient(135deg, #d4a800, #ffd700, #b8860b)' : 'linear-gradient(135deg, #4a4a6a, #6a6a8a, #3a3a5a)',
            border: isGold ? '1px solid rgba(255,220,80,0.5)' : '1px solid rgba(168,178,200,0.3)',
            marginBottom: '12px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: '2px',
            padding: '4px'
          }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{
                borderRadius: '2px',
                background: isGold ? 'rgba(200,140,0,0.5)' : 'rgba(100,100,140,0.5)'
              }} />
            ))}
          </div>

          {/* PAN */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {panGroups.map((group, i) => (
              <span key={i} style={{
                fontSize: '16px', fontWeight: 600, letterSpacing: '2px', fontFamily: 'monospace',
                color: isGold ? '#fff8e0' : 'rgba(255,255,255,0.9)'
              }}>
                {group}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ fontSize: '9px', color: isGold ? 'rgba(255,220,80,0.6)' : 'rgba(168,178,200,0.5)', letterSpacing: '1px', marginBottom: '2px' }}>CARDHOLDER</p>
            <p style={{ fontSize: '12px', fontWeight: 600, color: isGold ? '#fff8e0' : 'rgba(255,255,255,0.85)', letterSpacing: '1px' }}>
              {card.card_brand}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '9px', color: isGold ? 'rgba(255,220,80,0.6)' : 'rgba(168,178,200,0.5)', letterSpacing: '1px', marginBottom: '2px' }}>EXPIRES</p>
            <p style={{ fontSize: '12px', fontWeight: 600, color: isGold ? '#fff8e0' : 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>
              {revealed ? '12/28' : '••/••'}
            </p>
          </div>
          {/* Brand logo */}
          <div>
            {card.card_brand === 'MASTERCARD' ? (
              <div style={{ display: 'flex' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#eb001b', opacity: 0.9 }} />
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f79e1b', marginLeft: '-10px', opacity: 0.9 }} />
              </div>
            ) : (
              <span style={{ fontSize: '18px', fontWeight: 900, fontStyle: 'italic', color: isGold ? '#fff8e0' : 'rgba(255,255,255,0.9)', letterSpacing: '-1px' }}>
                VISA
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reveal button */}
      <button
        onClick={handleReveal}
        style={{
          position: 'absolute', top: '12px', right: '12px',
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'white', transition: 'all 0.2s'
        }}
      >
        {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

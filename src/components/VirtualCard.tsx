import React, { useState } from 'react';
import { Eye, EyeOff, Wifi, Snowflake } from 'lucide-react';
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
  holder_name?: string;
  balance?: number;
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

  const pan = card.mask_pan;
  const displayPan = revealed ? pan.replace('XXXXXX', '•• ••••') : pan;
  const panGroups = displayPan.match(/.{1,4}/g) || [];

  const goldGradient = 'linear-gradient(135deg, #1a1000 0%, #6b4500 25%, #b87d00 50%, #F4B400 72%, #ffd04d 85%, #c89200 100%)';
  const platinumGradient = 'linear-gradient(135deg, #0d0d1a 0%, #1a1a30 30%, #2a2a48 55%, #6C5CE7 85%, #4c3d9e 100%)';

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1.586',
        borderRadius: '24px',
        background: isGold ? goldGradient : platinumGradient,
        boxShadow: isGold
          ? '0 24px 64px rgba(244,180,0,0.35), 0 6px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25)'
          : '0 24px 64px rgba(108,92,231,0.30), 0 6px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        overflow: 'hidden',
        filter: isFrozen ? 'brightness(0.55) saturate(0.3)' : 'none',
        transition: 'filter 0.35s ease',
        userSelect: 'none'
      }}
    >
      {/* Shimmer overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isGold
          ? 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.18) 48%, transparent 66%)'
          : 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.07) 48%, transparent 66%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 4s infinite',
        pointerEvents: 'none'
      }} />

      {/* Radial highlight */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isGold
          ? 'radial-gradient(ellipse at 20% 20%, rgba(255,220,80,0.2) 0%, transparent 50%)'
          : 'radial-gradient(ellipse at 20% 20%, rgba(168,140,255,0.2) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />

      {/* Frozen overlay */}
      {isFrozen && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(59,130,246,0.12)', backdropFilter: 'blur(3px)', borderRadius: '24px', zIndex: 10
        }}>
          <div style={{ textAlign: 'center', color: '#93c5fd' }}>
            <Snowflake size={44} strokeWidth={1.5} />
            <p style={{ fontSize: '12px', fontWeight: 700, marginTop: '8px', letterSpacing: '2px' }}>FROZEN</p>
          </div>
        </div>
      )}

      <div style={{ padding: '22px 24px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{
              fontSize: '12px', fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase',
              color: isGold ? 'rgba(255,210,60,0.92)' : 'rgba(200,190,255,0.85)', marginBottom: '2px'
            }}>
              BorderPay
            </p>
            <p style={{
              fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px',
              color: isGold ? 'rgba(255,240,140,0.7)' : 'rgba(180,170,255,0.55)'
            }}>
              {card.card_tier} · {card.card_currency}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Wifi size={18} style={{
              color: isGold ? 'rgba(255,210,60,0.8)' : 'rgba(180,170,255,0.7)',
              transform: 'rotate(90deg)'
            }} />
          </div>
        </div>

        {/* Chip + PAN */}
        <div>
          {/* EMV Chip */}
          <div style={{
            width: '40px', height: '30px', borderRadius: '7px',
            background: isGold
              ? 'linear-gradient(135deg, #d4a800, #ffd700, #b8860b)'
              : 'linear-gradient(135deg, #5a4a8a, #7a6aaa, #3a3060)',
            border: isGold ? '1px solid rgba(255,210,60,0.6)' : '1px solid rgba(140,120,220,0.4)',
            marginBottom: '14px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: '2px',
            padding: '5px'
          }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{
                borderRadius: '2px',
                background: isGold ? 'rgba(180,120,0,0.6)' : 'rgba(100,80,160,0.6)'
              }} />
            ))}
          </div>

          {/* PAN */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            {panGroups.map((group, i) => (
              <span key={i} style={{
                fontSize: '15px', fontWeight: 600, letterSpacing: '2.5px', fontFamily: '"Courier New", monospace',
                color: isGold ? '#fff8e0' : 'rgba(230,225,255,0.95)'
              }}>
                {group}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ fontSize: '8px', color: isGold ? 'rgba(255,210,60,0.55)' : 'rgba(180,170,255,0.45)', letterSpacing: '1.2px', marginBottom: '3px', textTransform: 'uppercase' }}>Cardholder</p>
            <p style={{ fontSize: '12px', fontWeight: 700, color: isGold ? '#fff8e0' : 'rgba(230,225,255,0.9)', letterSpacing: '0.5px' }}>
              {card.holder_name || 'CARD HOLDER'}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '8px', color: isGold ? 'rgba(255,210,60,0.55)' : 'rgba(180,170,255,0.45)', letterSpacing: '1.2px', marginBottom: '3px', textTransform: 'uppercase' }}>Expires</p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: isGold ? '#fff8e0' : 'rgba(230,225,255,0.9)', fontFamily: '"Courier New", monospace' }}>
              {revealed ? '12/28' : '••/••'}
            </p>
          </div>
          {/* Brand logo */}
          <div>
            {card.card_brand === 'MASTERCARD' ? (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#eb001b', opacity: 0.92 }} />
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#f79e1b', marginLeft: '-12px', opacity: 0.92 }} />
              </div>
            ) : (
              <span style={{ fontSize: '20px', fontWeight: 900, fontStyle: 'italic', color: isGold ? '#fff8e0' : 'rgba(230,225,255,0.95)', letterSpacing: '-1px' }}>
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
          position: 'absolute', bottom: '16px', right: '68px',
          width: '30px', height: '30px', borderRadius: '50%',
          background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'white', transition: 'all 0.2s',
          backdropFilter: 'blur(4px)',
        }}
      >
        {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

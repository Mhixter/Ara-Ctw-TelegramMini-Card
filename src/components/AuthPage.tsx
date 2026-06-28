import React from 'react';
import BoorderPayLogo from './BoorderPayLogo';
import { API_BASE } from '../lib/api';

interface Props {
  isInTelegram: boolean;
  error?: string | null;
  onRetry: () => void;
}

export default function AuthPage({ isInTelegram, error, onRetry }: Props) {
  if (!isInTelegram) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        background: 'var(--tg-theme-bg-color, #0f0f23)',
        textAlign: 'center',
        gap: '0',
      }}>
        <div style={{ marginBottom: '24px' }}>
          <BoorderPayLogo size={72} showText={true} />
        </div>

        <div style={{
          background: 'rgba(108,99,255,0.08)',
          border: '1px solid rgba(108,99,255,0.2)',
          borderRadius: '20px',
          padding: '32px 24px',
          maxWidth: '340px',
          width: '100%',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✈️</div>
          <h2 style={{ fontWeight: 800, fontSize: '20px', marginBottom: '10px' }}>
            Open in Telegram
          </h2>
          <p style={{ color: 'var(--tg-theme-hint-color, #8a8a9a)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            BoorderPay is a Telegram Mini App. Open it through your Telegram bot to get started.
          </p>
          <a
            href="https://t.me/boorderpay_bot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: '14px 20px',
              borderRadius: '12px',
              background: 'var(--accent, #6c63ff)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '15px',
              textDecoration: 'none',
              marginBottom: '12px',
            }}
          >
            Open in Telegram →
          </a>
          <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color, #8a8a9a)', marginTop: '8px' }}>
            @boorderpay_bot
          </p>
        </div>

        <p style={{
          marginTop: '24px',
          fontSize: '11px',
          color: 'var(--tg-theme-hint-color, #8a8a9a)',
          opacity: 0.5,
        }}>
          API: {API_BASE}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      background: 'var(--tg-theme-bg-color, #0f0f23)',
      textAlign: 'center',
      gap: '0',
    }}>
      <div style={{ marginBottom: '28px' }}>
        <BoorderPayLogo size={64} showText={true} />
      </div>

      <div style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: '20px',
        padding: '28px 24px',
        maxWidth: '340px',
        width: '100%',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '14px' }}>⚠️</div>
        <h2 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>
          Sign-in Failed
        </h2>
        <p style={{ color: 'var(--tg-theme-hint-color, #8a8a9a)', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
          {error || 'Could not authenticate your Telegram account. Please try again.'}
        </p>
        <button
          onClick={onRetry}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--accent, #6c63ff)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

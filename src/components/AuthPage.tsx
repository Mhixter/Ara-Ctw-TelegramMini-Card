import React, { useState } from 'react';
import BoorderPayLogo from './BoorderPayLogo';

interface Props {
  isInTelegram: boolean;
  needsConnect?: boolean;
  error?: string | null;
  onConnect: () => void;
}

export default function AuthPage({ isInTelegram, needsConnect, error, onConnect }: Props) {
  const [pressed, setPressed] = useState(false);

  function handleConnect() {
    setPressed(true);
    onConnect();
  }

  if (!isInTelegram) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        background: 'var(--tg-theme-bg-color, #f5f5fa)',
        textAlign: 'center',
      }}>
        <div style={{ marginBottom: '28px' }}>
          <BoorderPayLogo size={72} showText={true} />
        </div>
        <div style={{
          background: 'white',
          border: '1px solid rgba(108,99,255,0.15)',
          borderRadius: '20px',
          padding: '32px 24px',
          maxWidth: '340px',
          width: '100%',
          boxShadow: '0 4px 24px rgba(108,99,255,0.08)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✈️</div>
          <h2 style={{ fontWeight: 800, fontSize: '20px', marginBottom: '10px', color: '#1a1a2e' }}>
            Open in Telegram
          </h2>
          <p style={{ color: '#8a8a9a', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
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
            }}
          >
            Open in Telegram →
          </a>
          <p style={{ fontSize: '11px', color: '#8a8a9a', marginTop: '12px' }}>
            @boorderpay_bot
          </p>
        </div>
      </div>
    );
  }

  const hasError = !!error && !needsConnect;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      background: 'var(--tg-theme-bg-color, #f5f5fa)',
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: '32px' }}>
        <BoorderPayLogo size={72} showText={true} />
      </div>

      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '32px 24px',
        maxWidth: '340px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(108,99,255,0.10)',
        border: hasError
          ? '1px solid rgba(239,68,68,0.2)'
          : '1px solid rgba(108,99,255,0.12)',
      }}>
        {hasError ? (
          <>
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>⚠️</div>
            <h2 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px', color: '#1a1a2e' }}>
              Sign-in Failed
            </h2>
            <p style={{ color: '#8a8a9a', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
              {error}
            </p>
          </>
        ) : (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #6c63ff 0%, #5b54e8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '30px',
            }}>
              🔐
            </div>
            <h2 style={{ fontWeight: 800, fontSize: '20px', marginBottom: '8px', color: '#1a1a2e' }}>
              Welcome to BoorderPay
            </h2>
            <p style={{ color: '#8a8a9a', fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>
              Cross-border payments, borderless.
            </p>
            <p style={{ color: '#aaaabc', fontSize: '12px', lineHeight: '1.5', marginBottom: '24px' }}>
              Tap the button below to sign in securely with your Telegram account.
            </p>
          </>
        )}

        <button
          onClick={handleConnect}
          disabled={pressed}
          style={{
            width: '100%',
            padding: '15px 20px',
            borderRadius: '14px',
            border: 'none',
            background: pressed
              ? 'rgba(108,99,255,0.6)'
              : 'linear-gradient(135deg, #6c63ff 0%, #5b54e8 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '15px',
            cursor: pressed ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: pressed ? 'none' : '0 4px 16px rgba(108,99,255,0.35)',
          }}
        >
          {pressed ? (
            <>
              <span style={{
                width: '16px', height: '16px', borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                animation: 'spin 0.7s linear infinite', display: 'inline-block',
              }} />
              Connecting…
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.85 8.72c-.14.63-.51.78-.97.48l-2.67-1.97-1.29 1.24c-.14.14-.26.26-.54.26l.19-2.7 4.91-4.44c.21-.19-.05-.29-.33-.1L7.72 14.5l-2.62-.82c-.57-.18-.58-.57.12-.84l10.26-3.96c.48-.18.9.11.16.92z" fill="white"/>
              </svg>
              Connect with Telegram
            </>
          )}
        </button>

        {hasError && (
          <p style={{ fontSize: '11px', color: '#aaaabc', marginTop: '12px' }}>
            Your Telegram identity will be used — no password needed.
          </p>
        )}
      </div>

      <p style={{ marginTop: '20px', fontSize: '11px', color: '#aaaabc' }}>
        Secured by Telegram · No passwords stored
      </p>
    </div>
  );
}

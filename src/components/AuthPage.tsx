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
        background: 'var(--tg-theme-bg-color)',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px' }}>
          <BoorderPayLogo size={80} showText={true} />
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(108,92,231,0.20)',
          borderRadius: '28px',
          padding: '36px 28px',
          maxWidth: '360px',
          width: '100%',
          boxShadow: '0 24px 64px rgba(108,92,231,0.12)',
          backdropFilter: 'blur(20px)',
        }}>
          {/* Illustration */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(108,92,231,0.25), rgba(108,92,231,0.1))',
            border: '1px solid rgba(108,92,231,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: '36px',
          }}>✈️</div>

          <h2 style={{ fontWeight: 900, fontSize: '22px', marginBottom: '10px', letterSpacing: '-0.5px' }}>
            Open in Telegram
          </h2>
          <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px', lineHeight: '1.65', marginBottom: '28px' }}>
            BorderPay is a Telegram Mini App. Open it through your Telegram bot to access cross-border payments.
          </p>

          <a
            href="https://t.me/boorderpay_bot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '16px 24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6C5CE7, #5548c8)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '15px',
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(108,92,231,0.4)',
              letterSpacing: '-0.2px',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.85 8.72c-.14.63-.51.78-.97.48l-2.67-1.97-1.29 1.24c-.14.14-.26.26-.54.26l.19-2.7 4.91-4.44c.21-.19-.05-.29-.33-.1L7.72 14.5l-2.62-.82c-.57-.18-.58-.57.12-.84l10.26-3.96c.48-.18.9.11.16.92z" fill="white"/>
            </svg>
            Open in Telegram
          </a>

          <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginTop: '14px' }}>
            @boorderpay_bot
          </p>
        </div>

        {/* Security badge */}
        <div style={{
          marginTop: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          borderRadius: '20px',
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.2)',
        }}>
          <span style={{ fontSize: '13px' }}>🔒</span>
          <span style={{ fontSize: '11px', color: 'rgba(34,197,94,0.9)', fontWeight: 600 }}>
            Secured by Telegram HMAC-SHA256
          </span>
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
      background: 'var(--tg-theme-bg-color)',
      textAlign: 'center',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '36px' }}>
        <BoorderPayLogo size={80} showText={true} />
      </div>

      {/* Main card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '28px',
        padding: '36px 28px',
        maxWidth: '360px',
        width: '100%',
        boxShadow: hasError
          ? '0 24px 64px rgba(239,68,68,0.12)'
          : '0 24px 64px rgba(108,92,231,0.14)',
        border: hasError
          ? '1px solid rgba(239,68,68,0.25)'
          : '1px solid rgba(108,92,231,0.20)',
        backdropFilter: 'blur(20px)',
      }}>
        {hasError ? (
          <>
            <div style={{
              width: '68px', height: '68px', borderRadius: '22px',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '32px',
            }}>⚠️</div>
            <h2 style={{ fontWeight: 900, fontSize: '20px', marginBottom: '10px', letterSpacing: '-0.4px' }}>
              Sign-in Failed
            </h2>
            <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '13px', lineHeight: '1.65', marginBottom: '24px' }}>
              {error}
            </p>
          </>
        ) : (
          <>
            {/* Shield icon */}
            <div style={{
              width: '68px', height: '68px', borderRadius: '22px',
              background: 'linear-gradient(135deg, rgba(108,92,231,0.3), rgba(108,92,231,0.12))',
              border: '1px solid rgba(108,92,231,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '32px',
              boxShadow: '0 8px 24px rgba(108,92,231,0.2)',
            }}>🔐</div>

            <h2 style={{ fontWeight: 900, fontSize: '22px', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Welcome to BorderPay
            </h2>
            <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px', lineHeight: '1.6', marginBottom: '6px' }}>
              Cross-border payments without borders.
            </p>
            <p style={{ color: 'rgba(139,139,158,0.65)', fontSize: '12px', lineHeight: '1.55', marginBottom: '28px' }}>
              Sign in securely with your Telegram account — no password needed.
            </p>
          </>
        )}

        {/* Connect button */}
        <button
          onClick={handleConnect}
          disabled={pressed}
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: '18px',
            border: 'none',
            background: pressed
              ? 'rgba(108,92,231,0.55)'
              : 'linear-gradient(135deg, #6C5CE7, #5548c8)',
            color: '#fff',
            fontWeight: 800,
            fontSize: '15px',
            fontFamily: 'inherit',
            letterSpacing: '-0.2px',
            cursor: pressed ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.2s ease',
            boxShadow: pressed ? 'none' : '0 8px 28px rgba(108,92,231,0.45)',
          }}
        >
          {pressed ? (
            <>
              <span className="spinner" style={{
                width: '18px', height: '18px', borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                display: 'inline-block', flexShrink: 0,
              }} />
              Connecting…
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.85 8.72c-.14.63-.51.78-.97.48l-2.67-1.97-1.29 1.24c-.14.14-.26.26-.54.26l.19-2.7 4.91-4.44c.21-.19-.05-.29-.33-.1L7.72 14.5l-2.62-.82c-.57-.18-.58-.57.12-.84l10.26-3.96c.48-.18.9.11.16.92z" fill="white"/>
              </svg>
              Connect with Telegram
            </>
          )}
        </button>

        {hasError && (
          <button
            onClick={handleConnect}
            style={{
              width: '100%', marginTop: '12px',
              padding: '12px', borderRadius: '14px',
              border: '1px solid var(--glass-border)',
              background: 'transparent', color: 'var(--tg-theme-hint-color)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Try again
          </button>
        )}
      </div>

      {/* Security badge */}
      <div style={{
        marginTop: '24px',
        display: 'flex', alignItems: 'center', gap: '7px',
        padding: '9px 18px',
        borderRadius: '20px',
        background: 'rgba(34,197,94,0.07)',
        border: '1px solid rgba(34,197,94,0.18)',
      }}>
        <span style={{ fontSize: '13px' }}>🔒</span>
        <span style={{ fontSize: '11px', color: 'rgba(34,197,94,0.85)', fontWeight: 700, letterSpacing: '0.2px' }}>
          Secured by Telegram HMAC-SHA256
        </span>
      </div>
    </div>
  );
}

import React, { useState } from 'react';

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

  const hasError = !!error && !needsConnect;

  const content = (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '48px 28px 40px', background: '#fff',
      textAlign: 'center', maxWidth: '480px', margin: '0 auto',
    }}>
      {/* Top section */}
      <div style={{ width: '100%' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '40px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #6C5CE7, #5548c8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(108,92,231,0.35)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.85 8.72c-.14.63-.51.78-.97.48l-2.67-1.97-1.29 1.24c-.14.14-.26.26-.54.26l.19-2.7 4.91-4.44c.21-.19-.05-.29-.33-.1L7.72 14.5l-2.62-.82c-.57-.18-.58-.57.12-.84l10.26-3.96c.48-.18.9.11.16.92z" fill="white"/>
            </svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '22px', fontWeight: 900, color: '#1a1a2e' }}>Border</span>
            <span style={{ fontSize: '22px', fontWeight: 900, color: '#6C5CE7' }}>Pay</span>
          </div>
        </div>

        {/* Hero illustration (CSS shield globe) */}
        <div style={{ position: 'relative', margin: '0 auto 32px', width: '200px', height: '200px' }}>
          {/* Outer ring */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(108,92,231,0.12), rgba(108,92,231,0.04))',
            border: '1.5px solid rgba(108,92,231,0.12)',
          }} />
          {/* Inner ring */}
          <div style={{
            position: 'absolute', inset: '24px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(108,92,231,0.16), rgba(108,92,231,0.06))',
            border: '1.5px solid rgba(108,92,231,0.18)',
          }} />
          {/* Shield */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '96px', height: '96px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C5CE7, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 16px 48px rgba(108,92,231,0.45)',
            }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 6.5V12c0 5 3.8 9.7 9 11 5.2-1.3 9-6 9-11V6.5L12 2z" fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="1.5"/>
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          {/* Floating chips */}
          <div style={{ position: 'absolute', top: '20px', left: '8px', background: '#fff', borderRadius: '12px', padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 700, color: '#1a1a2e' }}>
            🔒 Secure
          </div>
          <div style={{ position: 'absolute', bottom: '20px', right: '2px', background: '#fff', borderRadius: '12px', padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 700, color: '#1a1a2e' }}>
            🌍 Global
          </div>
          <div style={{ position: 'absolute', top: '60px', right: '4px', background: '#FFF8E1', borderRadius: '12px', padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 700, color: '#c8900a' }}>
            💰 $
          </div>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#1a1a2e', marginBottom: '12px', lineHeight: 1.2, letterSpacing: '-0.5px' }}>
          Welcome to <span style={{ color: '#6C5CE7' }}>BorderPay</span>
        </h1>
        <p style={{ fontSize: '15px', color: '#7474A0', lineHeight: 1.6, marginBottom: '32px' }}>
          Secure, fast and borderless payments<br />powered by Telegram technology.
        </p>

        {/* Feature card */}
        {!hasError && (
          <div style={{
            background: '#F4F4FF', border: '1.5px solid rgba(108,92,231,0.15)',
            borderRadius: '16px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '14px',
            marginBottom: '28px', textAlign: 'left',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
              background: 'rgba(108,92,231,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4" stroke="#6C5CE7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="9" stroke="#6C5CE7" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: '14px', color: '#1a1a2e', marginBottom: '2px' }}>Secure Login with Telegram</p>
              <p style={{ fontSize: '12px', color: '#7474A0', lineHeight: 1.4 }}>
                We use Telegram OAuth to securely verify your identity and protect your account.
              </p>
            </div>
          </div>
        )}

        {hasError && (
          <div style={{
            background: '#FFF5F5', border: '1.5px solid rgba(239,68,68,0.2)',
            borderRadius: '16px', padding: '16px 20px',
            display: 'flex', gap: '12px', alignItems: 'flex-start',
            marginBottom: '24px', textAlign: 'left',
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 800, fontSize: '14px', color: '#EF4444', marginBottom: '4px' }}>Sign-in Failed</p>
              <p style={{ fontSize: '12px', color: '#7474A0' }}>{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div style={{ width: '100%' }}>
        {!isInTelegram ? (
          <a
            href="https://t.me/boorderpay_bot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              padding: '17px 24px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #6C5CE7, #5548c8)',
              color: '#fff', fontWeight: 800, fontSize: '16px',
              textDecoration: 'none', width: '100%',
              boxShadow: '0 8px 28px rgba(108,92,231,0.4)',
              letterSpacing: '-0.2px', marginBottom: '16px',
            }}
          >
            <TelegramIcon />
            Open in Telegram
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 'auto' }}>
              <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </a>
        ) : (
          <button
            onClick={handleConnect}
            disabled={pressed}
            style={{
              width: '100%', padding: '17px 24px', borderRadius: '16px',
              border: 'none', background: pressed
                ? 'rgba(108,92,231,0.55)'
                : 'linear-gradient(135deg, #6C5CE7, #5548c8)',
              color: '#fff', fontWeight: 800, fontSize: '16px',
              fontFamily: 'inherit', letterSpacing: '-0.2px',
              cursor: pressed ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '12px', transition: 'all 0.2s ease',
              boxShadow: pressed ? 'none' : '0 8px 28px rgba(108,92,231,0.4)',
              marginBottom: '16px',
            }}
          >
            {pressed ? (
              <>
                <span className="spinner" style={{ width: 20, height: 20 }} />
                Connecting…
              </>
            ) : (
              <>
                <TelegramIcon />
                Connect with Telegram
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 'auto' }}>
                  <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </>
            )}
          </button>
        )}

        {hasError && (
          <button onClick={handleConnect} className="btn-ghost" style={{ marginBottom: '12px' }}>
            Try again
          </button>
        )}

        {/* Security badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4M12 2L3 6.5V12c0 5 3.8 9.7 9 11 5.2-1.3 9-6 9-11V6.5L12 2z" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: '12px', color: '#22C55E', fontWeight: 700 }}>
            Secured using Telegram HMAC-SHA256 Authentication
          </span>
        </div>
      </div>
    </div>
  );

  return content;
}

function TelegramIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.85 8.72c-.14.63-.51.78-.97.48l-2.67-1.97-1.29 1.24c-.14.14-.26.26-.54.26l.19-2.7 4.91-4.44c.21-.19-.05-.29-.33-.1L7.72 14.5l-2.62-.82c-.57-.18-.58-.57.12-.84l10.26-3.96c.48-.18.9.11.16.92z" fill="white"/>
    </svg>
  );
}

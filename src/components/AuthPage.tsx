import React, { useState } from 'react';
import BoorderPayLogo from './BoorderPayLogo';

interface Props {
  isInTelegram: boolean;
  needsConnect?: boolean;
  error?: string | null;
  onConnect: () => void;
}

function SecurityIllustration() {
  return (
    <svg width="220" height="160" viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="auth-grad1" x1="0" y1="0" x2="220" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C5CE7" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="auth-shield" x1="50" y1="20" x2="170" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C5CE7" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="auth-gold" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F4B400" />
          <stop offset="100%" stopColor="#ffd04d" />
        </linearGradient>
      </defs>
      {/* Background circle */}
      <circle cx="110" cy="80" r="72" fill="url(#auth-grad1)" />
      <circle cx="110" cy="80" r="72" stroke="rgba(108,92,231,0.1)" strokeWidth="1.5" strokeDasharray="4 6" />

      {/* Globe rings */}
      <ellipse cx="110" cy="80" rx="50" ry="50" stroke="rgba(108,92,231,0.15)" strokeWidth="1" fill="none" />
      <ellipse cx="110" cy="80" rx="25" ry="50" stroke="rgba(108,92,231,0.1)" strokeWidth="1" fill="none" />
      <line x1="60" y1="80" x2="160" y2="80" stroke="rgba(108,92,231,0.1)" strokeWidth="1" />

      {/* Shield */}
      <path d="M110 30 L138 44 L138 75 C138 92 126 105 110 112 C94 105 82 92 82 75 L82 44 Z"
        fill="url(#auth-shield)" opacity="0.9" />
      <path d="M110 30 L138 44 L138 75 C138 92 126 105 110 112 C94 105 82 92 82 75 L82 44 Z"
        stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" />

      {/* Check mark */}
      <path d="M97 72 L106 82 L124 62" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Orbit dots */}
      <circle cx="44" cy="55" r="5" fill="#22C55E" opacity="0.85" />
      <circle cx="44" cy="55" r="9" stroke="#22C55E" strokeWidth="1" fill="none" opacity="0.3" />

      <circle cx="176" cy="100" r="5" fill="#F4B400" opacity="0.85" />
      <circle cx="176" cy="100" r="9" stroke="#F4B400" strokeWidth="1" fill="none" opacity="0.3" />

      <circle cx="60" cy="128" r="4" fill="#6C5CE7" opacity="0.6" />
      <circle cx="162" cy="38" r="3" fill="#22C55E" opacity="0.5" />

      {/* Lock icon bottom */}
      <rect x="97" y="135" width="26" height="18" rx="4" fill="url(#auth-gold)" opacity="0.9" />
      <path d="M103 135 L103 130 C103 126 107 123 110 123 C113 123 117 126 117 130 L117 135"
        stroke="#F4B400" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="110" cy="144" r="2.5" fill="rgba(0,0,0,0.4)" />
    </svg>
  );
}

export default function AuthPage({ isInTelegram, needsConnect, error, onConnect }: Props) {
  const [pressed, setPressed] = useState(false);

  function handleConnect() {
    setPressed(true);
    onConnect();
  }

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '28px 20px',
    background: 'var(--tg-theme-bg-color)',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  };

  if (!isInTelegram) {
    return (
      <div style={containerStyle}>
        {/* Background gradient orbs */}
        <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,92,231,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,180,0,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="fade-in-up" style={{ maxWidth: '360px', width: '100%' }}>
          <div style={{ marginBottom: '20px' }}>
            <BoorderPayLogo size={64} showText={true} />
          </div>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '36px', letterSpacing: '-0.1px' }}>
            Cross-border payments without borders
          </p>

          <div style={{ marginBottom: '32px' }}>
            <SecurityIllustration />
          </div>

          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(24px)',
            border: '1px solid var(--glass-border)',
            borderRadius: '24px',
            padding: '28px 24px',
            boxShadow: 'var(--glass-shadow)',
          }}>
            <h2 style={{ fontWeight: 800, fontSize: '22px', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Welcome to BorderPay
            </h2>
            <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              BorderPay is a Telegram Mini App. Open it through Telegram to access your premium fintech experience.
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
                padding: '15px 20px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6C5CE7 0%, #8b5cf6 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '15px',
                textDecoration: 'none',
                boxShadow: '0 6px 24px rgba(108,92,231,0.35)',
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

          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--tg-theme-hint-color)" strokeWidth="1.8"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--tg-theme-hint-color)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>
              Secured using Telegram HMAC-SHA256 Authentication
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasError = !!error && !needsConnect;

  return (
    <div style={containerStyle}>
      {/* Background gradient orbs */}
      <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '340px', height: '340px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,92,231,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-80px', right: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,180,0,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '30%', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="fade-in-up" style={{ maxWidth: '360px', width: '100%' }}>
        {/* Logo */}
        <div style={{ marginBottom: '20px' }}>
          <BoorderPayLogo size={68} showText={true} />
        </div>
        <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '28px', letterSpacing: '-0.1px' }}>
          Cross-border payments without borders
        </p>

        {/* Security illustration */}
        {!hasError && (
          <div className="float-anim" style={{ marginBottom: '28px' }}>
            <SecurityIllustration />
          </div>
        )}

        {/* Card */}
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(24px)',
          border: hasError ? '1px solid rgba(239,68,68,0.25)' : '1px solid var(--glass-border)',
          borderRadius: '24px',
          padding: '28px 24px',
          boxShadow: hasError
            ? '0 8px 32px rgba(239,68,68,0.08)'
            : '0 8px 32px rgba(108,92,231,0.10)',
        }}>
          {hasError ? (
            <>
              <div style={{ fontSize: '44px', marginBottom: '14px' }}>⚠️</div>
              <h2 style={{ fontWeight: 800, fontSize: '20px', marginBottom: '8px', letterSpacing: '-0.4px' }}>
                Sign-in Failed
              </h2>
              <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '13px', lineHeight: '1.6', marginBottom: '22px' }}>
                {error}
              </p>
            </>
          ) : (
            <>
              <div style={{
                width: '64px', height: '64px', borderRadius: '20px',
                background: 'linear-gradient(135deg, #6C5CE7 0%, #8b5cf6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px',
                boxShadow: '0 8px 28px rgba(108,92,231,0.35)',
                fontSize: '28px',
              }}>
                🔐
              </div>
              <h2 style={{ fontWeight: 800, fontSize: '22px', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                Welcome to BorderPay
              </h2>
              <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '13px', lineHeight: '1.65', marginBottom: '6px' }}>
                Your premium cross-border payments wallet.
              </p>
              <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '12px', lineHeight: '1.55', marginBottom: '24px', opacity: 0.8 }}>
                Sign in securely using your Telegram account — no password required.
              </p>
            </>
          )}

          <button
            onClick={handleConnect}
            disabled={pressed}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: '16px',
              border: 'none',
              background: pressed
                ? 'rgba(108,92,231,0.5)'
                : 'linear-gradient(135deg, #6C5CE7 0%, #8b5cf6 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '15px',
              fontFamily: 'inherit',
              cursor: pressed ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s ease',
              boxShadow: pressed ? 'none' : '0 6px 24px rgba(108,92,231,0.38)',
              letterSpacing: '-0.2px',
            }}
          >
            {pressed ? (
              <>
                <span style={{
                  width: '17px', height: '17px', borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block',
                }} />
                Connecting…
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.85 8.72c-.14.63-.51.78-.97.48l-2.67-1.97-1.29 1.24c-.14.14-.26.26-.54.26l.19-2.7 4.91-4.44c.21-.19-.05-.29-.33-.1L7.72 14.5l-2.62-.82c-.57-.18-.58-.57.12-.84l10.26-3.96c.48-.18.9.11.16.92z" fill="white"/>
                </svg>
                Connect with Telegram
              </>
            )}
          </button>
        </div>

        {/* Security badge */}
        <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', borderRadius: '20px',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v6c0 5.25 3.75 10.13 9 11.25C17.25 23.13 21 18.25 21 13V7L12 2z" fill="#22C55E" opacity="0.9"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#22C55E' }}>
              Secured using Telegram HMAC-SHA256 Authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

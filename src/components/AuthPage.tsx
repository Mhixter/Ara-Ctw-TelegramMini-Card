import React, { useState } from 'react';
import BoorderPayLogo from './BoorderPayLogo';

interface AuthPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, firstName: string) => Promise<void>;
  onGitHubSignIn: () => void;
  error?: string | null;
  loading?: boolean;
}

export default function AuthPage({ onLogin, onRegister, onGitHubSignIn, error, loading }: AuthPageProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const displayError = localError || error;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError('Please fill in all required fields.');
      return;
    }

    if (tab === 'signup') {
      if (password.length < 8) {
        setLocalError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (tab === 'login') {
        await onLogin(email.trim(), password);
      } else {
        await onRegister(email.trim(), password, firstName.trim());
      }
    } catch (err: any) {
      setLocalError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function switchTab(t: 'login' | 'signup') {
    setTab(t);
    setLocalError(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
  }

  const busy = submitting || !!loading;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      background: 'var(--tg-theme-bg-color, #0f0f23)',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ margin: '0 auto 8px' }}>
            <BoorderPayLogo size={64} showText={true} />
          </div>
          <p style={{ color: 'var(--tg-theme-hint-color, #8a8a9a)', fontSize: '13px', marginTop: '6px' }}>
            Cross-border payments, simplified
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px',
        }}>
          {(['login', 'signup'] as const).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '9px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s',
                background: tab === t ? 'var(--accent, #6c63ff)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--tg-theme-hint-color, #8a8a9a)',
              }}
            >
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {tab === 'signup' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tg-theme-hint-color, #8a8a9a)', display: 'block', marginBottom: '6px' }}>
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Your first name"
                style={inputStyle}
                autoComplete="given-name"
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tg-theme-hint-color, #8a8a9a)', display: 'block', marginBottom: '6px' }}>
              Email Address <span style={{ color: 'var(--accent, #6c63ff)' }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
              autoComplete="email"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tg-theme-hint-color, #8a8a9a)', display: 'block', marginBottom: '6px' }}>
              Password <span style={{ color: 'var(--accent, #6c63ff)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={tab === 'signup' ? 'At least 8 characters' : 'Your password'}
                required
                style={{ ...inputStyle, paddingRight: '44px' }}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                  color: 'var(--tg-theme-hint-color, #8a8a9a)', fontSize: '12px',
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {tab === 'signup' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tg-theme-hint-color, #8a8a9a)', display: 'block', marginBottom: '6px' }}>
                Confirm Password <span style={{ color: 'var(--accent, #6c63ff)' }}>*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                required
                style={inputStyle}
                autoComplete="new-password"
              />
            </div>
          )}

          {displayError && (
            <div style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '13px',
              color: '#f87171',
              lineHeight: '1.5',
            }}>
              {displayError}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary"
            style={{ marginTop: '4px', opacity: busy ? 0.7 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}
          >
            {busy ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{
                  width: '16px', height: '16px', borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block',
                }} />
                {tab === 'login' ? 'Signing in…' : 'Creating account…'}
              </span>
            ) : (
              tab === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color, #8a8a9a)' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* GitHub button */}
        <button
          onClick={onGitHubSignIn}
          disabled={busy}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '13px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--tg-theme-text-color, #fff)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: busy ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            opacity: busy ? 0.6 : 1,
          }}
        >
          <GitHubIcon />
          Continue with GitHub
        </button>

        <p style={{
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--tg-theme-hint-color, #8a8a9a)',
          marginTop: '24px',
          lineHeight: '1.6',
        }}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--tg-theme-text-color, #fff)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

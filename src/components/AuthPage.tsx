import React, { useState } from 'react';

interface AuthPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, firstName: string) => Promise<void>;
  onGoogleSignIn: () => void;
  error?: string | null;
  loading?: boolean;
}

export default function AuthPage({ onLogin, onRegister, onGoogleSignIn, error, loading }: AuthPageProps) {
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
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--accent, #6c63ff), #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(108,99,255,0.35)',
            margin: '0 auto 16px',
          }}>
            <span style={{ fontSize: '28px' }}>₦</span>
          </div>
          <h1 style={{ fontWeight: 800, fontSize: '24px', margin: 0 }}>NairaVault</h1>
          <p style={{ color: 'var(--tg-theme-hint-color, #8a8a9a)', fontSize: '13px', marginTop: '6px' }}>
            Your secure digital wallet
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

        {/* Google button */}
        <button
          onClick={onGoogleSignIn}
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
          <GoogleIcon />
          Continue with Google
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
      <path d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
      <path d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
      <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.314 0-9.822-3.418-11.411-8.144l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
      <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
    </svg>
  );
}

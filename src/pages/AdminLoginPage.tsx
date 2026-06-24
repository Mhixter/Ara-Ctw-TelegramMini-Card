import React, { useState } from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../lib/api';

interface Props {
  onLogin: (adminData: { token: string; role: string }) => void;
}

export default function AdminLoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      const data = await authApi.adminLogin(email, password);
      onLogin({ token: data.token, role: data.admin.role });
    } catch (e: any) {
      setError(e.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px var(--accent-glow)'
          }}>
            <Shield size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Admin Console</h1>
          <p style={{ fontSize: '14px', color: 'var(--tg-theme-hint-color)' }}>NairaVault Back Office</p>
        </div>

        <div className="glass" style={{ padding: '28px 24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>Email Address</label>
            <input className="input-field" type="email" placeholder="admin@nairavault.io" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input className="input-field" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ paddingRight: '44px' }} />
              <button onClick={() => setShowPw(s => !s)} style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tg-theme-hint-color)', padding: '4px'
              }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button className="btn-primary" onClick={handleLogin} disabled={!email || !password || loading}>
            {loading ? 'Authenticating...' : 'Sign In to Console'}
          </button>

          {error && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '12px', textAlign: 'center' }}>{error}</p>}
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginTop: '20px' }}>
          Access restricted to authorized personnel only
        </p>
      </div>
    </div>
  );
}

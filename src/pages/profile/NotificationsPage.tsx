import React, { useState } from 'react';
import { Bell, ChevronLeft, BellOff, Wallet, CreditCard, Shield, AlertTriangle, Info } from 'lucide-react';

interface Props { onBack: () => void; }

interface NotifSetting {
  id: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  label: string;
  desc: string;
  enabled: boolean;
}

export default function NotificationsPage({ onBack }: Props) {
  const [settings, setSettings] = useState<NotifSetting[]>([
    { id: 'wallet_credit', icon: Wallet, iconColor: 'var(--success)', label: 'Wallet Credits', desc: 'Get notified when your NGN wallet receives funds', enabled: true },
    { id: 'wallet_debit', icon: Wallet, iconColor: 'var(--danger)', label: 'Wallet Debits', desc: 'Alerts for card issuance fees and transfers', enabled: true },
    { id: 'card_activity', icon: CreditCard, iconColor: 'var(--gold)', label: 'Card Transactions', desc: 'Every time your virtual card is charged or declined', enabled: true },
    { id: 'card_freeze', icon: CreditCard, iconColor: 'var(--warning)', label: 'Card Status Changes', desc: 'Card frozen, unfrozen, or limit updates', enabled: true },
    { id: 'kyc_update', icon: Shield, iconColor: 'var(--accent)', label: 'KYC Status Updates', desc: 'When your identity verification is approved or flagged', enabled: true },
    { id: 'security_alert', icon: AlertTriangle, iconColor: 'var(--danger)', label: 'Security Alerts', desc: 'Unusual activity, failed login attempts', enabled: true },
    { id: 'system', icon: Info, iconColor: 'var(--tg-theme-hint-color)', label: 'System Updates', desc: 'Platform news, new features, maintenance windows', enabled: false },
  ]);

  function toggle(id: string) {
    setSettings(s => s.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n));
  }

  const enabledCount = settings.filter(s => s.enabled).length;

  return (
    <div className="page" style={{ paddingTop: '16px' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
        <ChevronLeft size={18} /> Back
      </button>

      <div style={{ marginBottom: '28px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
          <Bell size={26} color="var(--accent)" />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Notifications</h1>
        <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>{enabledCount} of {settings.length} alerts enabled</p>
      </div>

      {/* Telegram note */}
      <div className="glass" style={{ padding: '14px', marginBottom: '20px', background: 'rgba(108,99,255,0.06)', borderColor: 'rgba(108,99,255,0.2)' }}>
        <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', lineHeight: 1.6 }}>
          📱 <strong style={{ color: 'var(--tg-theme-text-color)' }}>Telegram native alerts.</strong> All notifications are delivered directly through your Telegram bot — no push permission required. Make sure you haven't muted the BoorderPay bot.
        </p>
      </div>

      {/* Settings list */}
      <div className="glass" style={{ overflow: 'hidden', marginBottom: '20px' }}>
        {settings.map((setting, i) => {
          const Icon = setting.icon;
          return (
            <div key={setting.id}>
              <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${setting.iconColor}15`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={setting.iconColor} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{setting.label}</p>
                  <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', lineHeight: 1.4 }}>{setting.desc}</p>
                </div>
                {/* Toggle */}
                <div
                  onClick={() => toggle(setting.id)}
                  style={{
                    width: '44px', height: '26px', borderRadius: '13px', flexShrink: 0, cursor: 'pointer',
                    background: setting.enabled ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
                    position: 'relative', transition: 'background 0.2s ease',
                    boxShadow: setting.enabled ? '0 0 12px rgba(108,99,255,0.4)' : 'none'
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '3px',
                    left: setting.enabled ? '21px' : '3px',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s ease',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                  }} />
                </div>
              </div>
              {i < settings.length - 1 && <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0 16px' }} />}
            </div>
          );
        })}
      </div>

      {/* All on/off */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn-primary" style={{ flex: 1, fontSize: '13px', padding: '12px' }}
          onClick={() => setSettings(s => s.map(n => ({ ...n, enabled: true })))}>
          <Bell size={14} /> Enable All
        </button>
        <button className="btn-ghost" style={{ flex: 1, fontSize: '13px', padding: '12px' }}
          onClick={() => setSettings(s => s.map(n => ({ ...n, enabled: false })))}>
          <BellOff size={14} /> Disable All
        </button>
      </div>
    </div>
  );
}

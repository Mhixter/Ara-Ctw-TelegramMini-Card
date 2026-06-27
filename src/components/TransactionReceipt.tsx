import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, ArrowDownCircle, ArrowUpCircle, Copy, CheckCircle2,
  Clock, ShoppingBag, CreditCard, Wallet, RefreshCw, ExternalLink
} from 'lucide-react';
import { walletApi } from '../lib/api';

interface Props {
  tx: any;
  onClose: () => void;
}

const PURPOSE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  WALLET_FUNDING:    { label: 'Wallet Funded',   icon: <Wallet size={22} />,       color: 'var(--success)' },
  CARD_ISSUANCE:     { label: 'Card Issued',      icon: <CreditCard size={22} />,   color: 'var(--gold)' },
  CARD_SPEND:        { label: 'Card Purchase',    icon: <ShoppingBag size={22} />,  color: 'var(--accent)' },
  CARD_FUNDING:      { label: 'Card Funded',      icon: <CreditCard size={22} />,   color: 'var(--success)' },
  FEE_CHARGE:        { label: 'Fee Charged',      icon: <ArrowUpCircle size={22} />,color: 'var(--danger)' },
  MERCHANT_PURCHASE: { label: 'Purchase',         icon: <ShoppingBag size={22} />,  color: 'var(--accent)' },
};

function StatusDot({ status }: { status: string }) {
  const s = (status || 'completed').toLowerCase();
  const color = s === 'completed' || s === 'success' ? 'var(--success)'
    : s === 'pending' ? 'var(--warning)'
    : s === 'failed' ? 'var(--danger)'
    : 'var(--tg-theme-hint-color)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 6px ${color}` }} />
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Completed'}</span>
    </span>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>{label}</span>
      <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--success)' : 'var(--tg-theme-text-color)', fontSize: 13, fontWeight: 500, padding: 0 }}>
        <span style={{ maxWidth: 180, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{value}</span>
        {copied ? <CheckCircle2 size={13} color="var(--success)" /> : <Copy size={12} color="var(--tg-theme-hint-color)" />}
      </button>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: color || 'var(--tg-theme-text-color)' }}>{value}</span>
    </div>
  );
}

export default function TransactionReceipt({ tx, onClose }: Props) {
  const isCredit = !!tx.credit_wallet_id;
  const meta = (() => { try { return JSON.parse(tx.metadata || '{}'); } catch { return {}; } })();
  const purpose = tx.purpose as string;
  const purpMeta = PURPOSE_META[purpose] || { label: purpose, icon: <Clock size={22} />, color: 'var(--tg-theme-hint-color)' };

  // Fetch full details (includes bank names, account numbers)
  const { data: detail, isLoading } = useQuery({
    queryKey: ['tx-detail', tx.id],
    queryFn: () => walletApi.transaction(tx.id),
    initialData: tx,
    staleTime: 30_000,
  });

  // Polling for pending txns
  const [elapsed, setElapsed] = useState(0);
  const isPending = (detail?.status || '').toLowerCase() === 'pending';
  useEffect(() => {
    if (!isPending) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [isPending]);

  const amountColor = isCredit ? 'var(--success)' : 'var(--danger)';
  const amountSign = isCredit ? '+' : '-';
  const amount = Number(detail?.amount || tx.amount);

  const createdAt = new Date(detail?.created_at || tx.created_at);
  const dateStr = createdAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = createdAt.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Source / destination display
  const sourceLabel = isCredit
    ? (meta.source === 'webhook' ? `${detail?.credit_bank || ''} · ${detail?.credit_account || meta.account_number || 'Virtual Account'}` : 'Internal / Manual')
    : (meta.merchant || meta.source || 'Internal');
  const destLabel = isCredit ? 'NGN Wallet' : (meta.merchant || meta.mask_pan || 'Merchant');

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 300, padding: '0'
    }} onClick={onClose}>
      <div
        className="glass-strong"
        style={{ width: '100%', maxWidth: 480, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Close */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px 0' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tg-theme-hint-color)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Header */}
        <div style={{ padding: '4px 24px 20px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
            background: `${purpMeta.color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1.5px solid ${purpMeta.color}40`
          }}>
            <span style={{ color: purpMeta.color }}>{purpMeta.icon}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>{purpMeta.label}</p>
          <p style={{ fontSize: 34, fontWeight: 900, color: amountColor, lineHeight: 1, marginBottom: 6 }}>
            {amountSign}₦{amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </p>
          <StatusDot status={detail?.status || 'COMPLETED'} />
        </div>

        {/* Live tracking for pending */}
        {isPending && (
          <div style={{ margin: '0 20px 12px', padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <RefreshCw size={14} color="var(--warning)" style={{ animation: 'spin 1.5s linear infinite' }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)' }}>Transaction in progress</p>
              <p style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)' }}>Processing for {elapsed}s · Usually completes in &lt;30s</p>
            </div>
          </div>
        )}

        {/* Receipt body */}
        <div style={{ overflowY: 'auto', padding: '0 20px 32px', flex: 1 }}>
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 38, borderRadius: 8 }} />)}
            </div>
          )}

          <div className="glass" style={{ padding: '0 16px', marginBottom: 16 }}>
            <Row label="Date" value={dateStr} />
            <Row label="Time" value={timeStr} />
            <Row label="Amount" value={`₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`} color={amountColor} />
            <Row label="Type" value={purpMeta.label} />
            <Row label="Direction" value={isCredit ? '↓ Credit' : '↑ Debit'} color={amountColor} />
          </div>

          {/* Source / Destination */}
          <div className="glass" style={{ padding: '0 16px', marginBottom: 16 }}>
            <Row label="From" value={sourceLabel || '—'} />
            <Row label="To" value={destLabel || '—'} />
            {meta.provider && <Row label="Provider" value={meta.provider.charAt(0).toUpperCase() + meta.provider.slice(1)} />}
            {meta.merchant && <Row label="Merchant" value={meta.merchant} />}
            {meta.mask_pan && <Row label="Card" value={meta.mask_pan} />}
            {meta.card_tier && <Row label="Card Tier" value={meta.card_tier} />}
          </div>

          {/* References */}
          <div className="glass" style={{ padding: '0 16px', marginBottom: 16 }}>
            <CopyField label="Reference" value={detail?.transaction_reference || tx.transaction_reference || '—'} />
            <CopyField label="Transaction ID" value={detail?.id || tx.id || '—'} />
            {meta.account_number && <CopyField label="Account No." value={meta.account_number} />}
          </div>

          {/* Processing trail */}
          <div className="glass" style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--tg-theme-hint-color)', marginBottom: 12, letterSpacing: '0.5px' }}>PROCESSING TRAIL</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Transaction initiated', time: timeStr, done: true },
                { label: 'Provider verification', time: meta.source === 'webhook' ? 'Via webhook' : 'Instant', done: true },
                { label: 'Ledger entry recorded', time: 'Double-entry', done: true },
                { label: 'Wallet balance updated', time: 'Ledger-authoritative', done: !isPending },
                { label: 'Settlement complete', time: isPending ? 'Pending…' : 'Complete', done: !isPending },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i < 4 ? 14 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: step.done ? 'var(--success)' : 'rgba(255,255,255,0.1)',
                      border: step.done ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {step.done && <CheckCircle2 size={12} color="white" />}
                    </div>
                    {i < 4 && <div style={{ width: 1, flex: 1, background: step.done ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)', marginTop: 3 }} />}
                  </div>
                  <div style={{ paddingBottom: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: step.done ? 'var(--tg-theme-text-color)' : 'var(--tg-theme-hint-color)', marginBottom: 1 }}>{step.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)' }}>{step.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

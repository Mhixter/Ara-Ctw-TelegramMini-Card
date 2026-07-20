import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, BarChart2, BookOpen, Shield, RefreshCw,
  ChevronRight, X, TrendingUp, CreditCard, Activity,
  Clock, CheckCircle, XCircle, Globe
} from 'lucide-react';
import { adminApi } from '../lib/api';
import { useTelegram } from '../hooks/useTelegram';

interface Props { adminRole: string; }

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:        'Super Admin',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  CUSTOMER_SUPPORT:   'Customer Support',
  FINANCE_AUDITOR:    'Finance Auditor',
};

const PURPOSE_LABELS: Record<string, string> = {
  WALLET_FUNDING:    'Wallet Funded',
  CARD_ISSUANCE:     'Card Issued',
  CARD_SPEND:        'Card Spend',
  CARD_FUNDING:      'Card Funded',
  MERCHANT_PURCHASE: 'Purchase',
  FEE_CHARGE:        'Fee',
};

const KYC_COLOR: Record<string, string> = {
  PENDING:        'var(--warning)',
  PENDING_REVIEW: 'var(--accent)',
  TIER_1:         'var(--gold)',
  TIER_2:         'var(--platinum)',
  BANNED:         'var(--danger)',
};

function fmtNGN(n: number | string) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

export default function AdminPage({ adminRole }: Props) {
  const qc = useQueryClient();
  const { haptic } = useTelegram();

  const canSeeFinance  = ['SUPER_ADMIN', 'FINANCE_AUDITOR', 'COMPLIANCE_OFFICER'].includes(adminRole);
  const canManageKyc   = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER'].includes(adminRole);
  const canCreateAdmin = adminRole === 'SUPER_ADMIN';

  const tabs = [
    { id: 'overview',  label: 'Overview',  icon: BarChart2 },
    { id: 'users',     label: 'Users',     icon: Users },
    ...(canManageKyc  ? [{ id: 'kycqueue',  label: 'KYC Queue', icon: Clock   }] : []),
    ...(canSeeFinance ? [{ id: 'ledger',    label: 'Ledger',    icon: BookOpen }] : []),
    ...(canSeeFinance ? [{ id: 'treasury',  label: 'Treasury',  icon: Shield   }] : []),
  ];

  const [activeSection, setActiveSection] = useState<string>('overview');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', role: 'CUSTOMER_SUPPORT' });
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.stats,
    refetchInterval: 60_000,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', search, kycFilter],
    queryFn: () => adminApi.users({ search, kycStatus: kycFilter }),
    enabled: activeSection === 'users',
  });

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['admin-ledger'],
    queryFn: () => adminApi.ledger({ limit: 50 }),
    enabled: activeSection === 'ledger' && canSeeFinance,
  });

  const { data: userDetail } = useQuery({
    queryKey: ['admin-user-detail', selectedUser],
    queryFn: () => adminApi.userDetail(selectedUser!),
    enabled: !!selectedUser,
  });

  const kycMutation = useMutation({
    mutationFn: ({ userId, kycStatus }: { userId: string; kycStatus: string }) =>
      adminApi.updateKyc(userId, kycStatus),
    onSuccess: () => {
      haptic('success');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user-detail', selectedUser] });
    },
  });

  const freezeMutation = useMutation({
    mutationFn: ({ cardId, status }: { cardId: string; status: string }) =>
      adminApi.freezeCard(cardId, status),
    onSuccess: () => {
      haptic('success');
      qc.invalidateQueries({ queryKey: ['admin-user-detail', selectedUser] });
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: () => adminApi.createAdmin(newAdmin),
    onSuccess: () => {
      haptic('success');
      setShowCreateAdmin(false);
      setNewAdmin({ email: '', password: '', role: 'CUSTOMER_SUPPORT' });
    },
  });

  const { data: kycQueueData, isLoading: kycQueueLoading } = useQuery({
    queryKey: ['admin-kyc-queue'],
    queryFn: adminApi.kycQueue,
    enabled: activeSection === 'kycqueue' && canManageKyc,
    refetchInterval: 30_000,
  });

  const [rejectState, setRejectState] = useState<{ userId: string; reason: string } | null>(null);
  const [sweepAmount, setSweepAmount] = useState('');

  const { data: treasuryData, isLoading: treasuryLoading, refetch: refetchTreasury } = useQuery({
    queryKey: ['admin-treasury'],
    queryFn: adminApi.treasury,
    enabled: activeSection === 'treasury' && canSeeFinance,
    refetchInterval: 60_000,
  });

  const sweepMutation = useMutation({
    mutationFn: () => adminApi.sweep(parseFloat(sweepAmount)),
    onSuccess: () => {
      haptic('success');
      setSweepAmount('');
      refetchTreasury();
    },
  });

  const approveKycMutation = useMutation({
    mutationFn: ({ userId, tier }: { userId: string; tier: string }) =>
      adminApi.approveKyc(userId, tier),
    onSuccess: () => {
      haptic('success');
      qc.invalidateQueries({ queryKey: ['admin-kyc-queue'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const rejectKycMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminApi.rejectKyc(userId, reason),
    onSuccess: () => {
      haptic('success');
      setRejectState(null);
      qc.invalidateQueries({ queryKey: ['admin-kyc-queue'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  return (
    <div className="page" style={{ paddingTop: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '2px' }}>Back Office</p>
          <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Admin Console</h1>
          <span style={{
            display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '6px',
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px',
            background: 'rgba(108,99,255,0.15)', color: 'var(--accent)',
            border: '1px solid rgba(108,99,255,0.25)'
          }}>
            {ROLE_LABELS[adminRole] || adminRole}
          </span>
        </div>
        <button onClick={() => qc.invalidateQueries()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tg-theme-hint-color)', padding: '8px' }}>
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeSection === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '20px', border: '1px solid',
              borderColor: active ? 'var(--accent)' : 'var(--glass-border)',
              background: active ? 'rgba(108,99,255,0.15)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--tg-theme-hint-color)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              <Icon size={14} />{tab.label}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW ── */}
      {activeSection === 'overview' && (
        <div>
          {statsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '14px' }} />)}
            </div>
          ) : stats && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {/* Total Users */}
                <div className="glass" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', letterSpacing: '0.5px' }}>TOTAL USERS</p>
                    <Users size={14} color="var(--accent)" />
                  </div>
                  <p style={{ fontSize: '28px', fontWeight: 900 }}>{Number(stats.totalUsers).toLocaleString()}</p>
                </div>

                {/* Active Cards */}
                <div className="glass" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', letterSpacing: '0.5px' }}>ACTIVE CARDS</p>
                    <CreditCard size={14} color="var(--gold)" />
                  </div>
                  <p style={{ fontSize: '28px', fontWeight: 900 }}>{stats.activeCards}</p>
                </div>

                {/* Total Volume — finance only */}
                {canSeeFinance && (
                  <div className="glass" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', letterSpacing: '0.5px' }}>TOTAL VOLUME</p>
                      <TrendingUp size={14} color="var(--success)" />
                    </div>
                    <p style={{ fontSize: '18px', fontWeight: 900, color: 'var(--success)' }}>
                      {fmtNGN(stats.totalVolume || 0)}
                    </p>
                  </div>
                )}

                {/* KYC Breakdown */}
                <div className="glass" style={{ padding: '16px', gridColumn: canSeeFinance ? 'auto' : 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', letterSpacing: '0.5px' }}>KYC BREAKDOWN</p>
                    <Activity size={14} color="var(--accent)" />
                  </div>
                  {stats.kycBreakdown?.map((k: any) => (
                    <div key={k.kyc_status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: KYC_COLOR[k.kyc_status] || 'var(--tg-theme-hint-color)', fontWeight: 600 }}>
                        {k.kyc_status}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>{k.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Liquidity — finance roles only */}
              {canSeeFinance && stats.walletTotals?.filter((w: any) => w.currency === 'NGN').length > 0 && (
                <>
                  <p style={{ fontSize: '11px', fontWeight: 700, marginBottom: '10px', color: 'var(--tg-theme-hint-color)', letterSpacing: '0.5px' }}>
                    PLATFORM LIQUIDITY
                  </p>
                  {stats.walletTotals.filter((w: any) => w.currency === 'NGN').map((w: any) => (
                    <div key={w.currency} className="glass" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>₦</div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '13px' }}>NGN Pool</p>
                          <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>Aggregate user balances</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--success)' }}>{fmtNGN(w.total)}</p>
                    </div>
                  ))}
                </>
              )}

              {/* Create Admin — SUPER_ADMIN only */}
              {canCreateAdmin && (
                <>
                  <button className="btn-primary" onClick={() => setShowCreateAdmin(v => !v)} style={{ marginBottom: '12px' }}>
                    <Shield size={16} /> {showCreateAdmin ? 'Cancel' : 'Create Admin Account'}
                  </button>
                  {showCreateAdmin && (
                    <div className="glass" style={{ padding: '20px', marginBottom: '16px' }}>
                      <h4 style={{ fontWeight: 700, marginBottom: '16px' }}>New Admin Account</h4>
                      {[
                        { key: 'email',    label: 'Email',    type: 'email',    placeholder: 'admin@boorderpay.com' },
                        { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
                      ].map(f => (
                        <div key={f.key} style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginBottom: '4px', display: 'block' }}>{f.label}</label>
                          <input className="input-field" type={f.type} placeholder={f.placeholder}
                            value={(newAdmin as any)[f.key]}
                            onChange={e => setNewAdmin(a => ({ ...a, [f.key]: e.target.value }))} />
                        </div>
                      ))}
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginBottom: '4px', display: 'block' }}>Role</label>
                        <select className="input-field" value={newAdmin.role} onChange={e => setNewAdmin(a => ({ ...a, role: e.target.value }))}>
                          {['SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'CUSTOMER_SUPPORT', 'FINANCE_AUDITOR'].map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      </div>
                      <button className="btn-primary" onClick={() => createAdminMutation.mutate()}
                        disabled={createAdminMutation.isPending || !newAdmin.email || !newAdmin.password}>
                        {createAdminMutation.isPending ? 'Creating...' : 'Create Account'}
                      </button>
                      {createAdminMutation.isError && (
                        <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '8px' }}>
                          {(createAdminMutation.error as any)?.response?.data?.error || 'Failed. Try again.'}
                        </p>
                      )}
                      {createAdminMutation.isSuccess && (
                        <p style={{ color: 'var(--success)', fontSize: '12px', marginTop: '8px' }}>Account created.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── USERS ── */}
      {activeSection === 'users' && (
        <div>
          <input className="input-field" placeholder="Search by name…"
            value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '10px' }} />
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['', 'PENDING', 'PENDING_REVIEW', 'TIER_1', 'TIER_2', 'BANNED'].map(s => (
              <button key={s} onClick={() => setKycFilter(s)} style={{
                padding: '6px 12px', borderRadius: '16px', border: '1px solid',
                borderColor: kycFilter === s ? 'var(--accent)' : 'var(--glass-border)',
                background: kycFilter === s ? 'rgba(108,99,255,0.15)' : 'transparent',
                color: kycFilter === s ? 'var(--accent)' : 'var(--tg-theme-hint-color)',
                fontSize: '12px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{s || 'All'}</button>
            ))}
          </div>

          {usersLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '60px', borderRadius: '12px' }} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {usersData?.users?.map((u: any) => (
                <div key={u.id} className="glass"
                  style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                  onClick={() => setSelectedUser(u.id)}>
                  <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '14px', flexShrink: 0 }}>
                    {(u.full_name?.[0] || 'U').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>
                      {u.full_name || `TG: ${u.telegram_id}`}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>
                      {new Date(u.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: KYC_COLOR[u.kyc_status] || 'var(--tg-theme-hint-color)', flexShrink: 0 }}>
                    {u.kyc_status}
                  </span>
                  <ChevronRight size={14} color="var(--tg-theme-hint-color)" />
                </div>
              ))}
              {!usersLoading && !usersData?.users?.length && (
                <div className="glass" style={{ padding: '32px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px' }}>No users found</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── KYC REVIEW QUEUE ── */}
      {activeSection === 'kycqueue' && canManageKyc && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontWeight: 700, marginBottom: '2px' }}>KYC Review Queue</h3>
              <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>
                {kycQueueData?.total ?? 0} pending submission{kycQueueData?.total !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={() => qc.invalidateQueries({ queryKey: ['admin-kyc-queue'] })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tg-theme-hint-color)', padding: '8px' }}>
              <RefreshCw size={16} />
            </button>
          </div>

          {kycQueueLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '14px' }} />)}
            </div>
          ) : kycQueueData?.queue?.length === 0 ? (
            <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>
              <CheckCircle size={32} color="var(--success)" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 700, marginBottom: '4px' }}>All clear!</p>
              <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>No pending KYC submissions.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {kycQueueData?.queue?.map((u: any) => (
                <div key={u.id} className="glass" style={{ padding: '16px', borderColor: 'rgba(108,99,255,0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '2px' }}>{u.full_name || 'No name'}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>
                          DOB: {u.date_of_birth ? new Date(u.date_of_birth).toLocaleDateString() : '—'}
                        </span>
                        {u.country && (
                          <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Globe size={10} />{u.country}
                          </span>
                        )}
                        {u.id_type && (
                          <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: 'rgba(108,99,255,0.12)', color: 'var(--accent)', fontWeight: 600 }}>
                            {u.id_type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>

                  {u.id_document_url && (
                    <a href={u.id_document_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'block', marginBottom: '12px', fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                      📎 View Document →
                    </a>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => approveKycMutation.mutate({ userId: u.id, tier: 'TIER_1' })}
                      disabled={approveKycMutation.isPending}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.3)',
                        background: 'rgba(34,197,94,0.1)', color: 'var(--success)',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      }}>
                      <CheckCircle size={13} /> Approve Tier 1
                    </button>
                    <button
                      onClick={() => approveKycMutation.mutate({ userId: u.id, tier: 'TIER_2' })}
                      disabled={approveKycMutation.isPending}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(245,185,66,0.3)',
                        background: 'rgba(245,185,66,0.1)', color: 'var(--gold)',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      }}>
                      <CheckCircle size={13} /> Approve T2
                    </button>
                    <button
                      onClick={() => setRejectState({ userId: u.id, reason: '' })}
                      style={{
                        padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      }}>
                      <XCircle size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── REJECT MODAL ── */}
      {rejectState && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div className="glass-strong" style={{ width: '100%', maxWidth: '480px', padding: '24px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>Reject KYC Submission</h3>
            <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', marginBottom: '16px' }}>
              The user will be notified with this reason and can resubmit.
            </p>
            <textarea
              className="input-field"
              rows={3}
              placeholder="e.g. Document not legible, please resubmit a clearer photo."
              value={rejectState.reason}
              onChange={e => setRejectState(s => s ? { ...s, reason: e.target.value } : null)}
              style={{ resize: 'none', marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setRejectState(null)}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--tg-theme-hint-color)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button
                onClick={() => rejectState && rejectKycMutation.mutate({ userId: rejectState.userId, reason: rejectState.reason || 'Identity could not be verified. Please resubmit.' })}
                disabled={rejectKycMutation.isPending}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--danger)', color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 700 }}>
                {rejectKycMutation.isPending ? 'Rejecting...' : 'Reject Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LEDGER (finance roles only) ── */}
      {activeSection === 'ledger' && canSeeFinance && (
        <div>
          <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>Ledger Entries</h3>

          {ledgerData?.totals && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
              {ledgerData.totals.map((t: any) => (
                <div key={t.purpose} className="glass" style={{ padding: '10px 14px', minWidth: 'fit-content' }}>
                  <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                    {PURPOSE_LABELS[t.purpose] || t.purpose}
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 700 }}>{fmtNGN(t.total)}</p>
                </div>
              ))}
            </div>
          )}

          {ledgerLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: '52px', borderRadius: '10px' }} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ledgerData?.entries?.map((e: any) => (
                <div key={e.id} className="glass" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>
                      {PURPOSE_LABELS[e.purpose] || e.purpose}
                    </p>
                    <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.transaction_reference}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 700 }}>{fmtNGN(e.amount)}</p>
                    <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)' }}>
                      {new Date(e.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── User Detail Modal ── */}
      {selectedUser && userDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div className="glass-strong" style={{ width: '100%', maxWidth: '480px', maxHeight: '85vh', overflow: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontWeight: 700 }}>User Details</h3>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tg-theme-hint-color)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div className="avatar" style={{ width: 48, height: 48, fontSize: 18, marginBottom: 10 }}>
                {(userDetail.user.full_name?.[0] || 'U').toUpperCase()}
              </div>
              <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '2px' }}>
                {userDetail.user.full_name || 'No name on record'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '8px' }}>
                Telegram ID: {userDetail.user.telegram_id}
              </p>
              <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: '8px',
                fontSize: '11px', fontWeight: 700,
                color: KYC_COLOR[userDetail.user.kyc_status] || 'var(--tg-theme-text-color)',
                background: `${KYC_COLOR[userDetail.user.kyc_status] || 'var(--glass-bg)'}`,
                border: `1px solid ${KYC_COLOR[userDetail.user.kyc_status] || 'var(--glass-border)'}`,
              }}>
                {userDetail.user.kyc_status}
              </span>
            </div>

            {/* KYC Update — compliance/super admin only */}
            {canManageKyc && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, marginBottom: '8px', color: 'var(--tg-theme-hint-color)', letterSpacing: '0.5px' }}>
                  UPDATE KYC STATUS
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['PENDING', 'PENDING_REVIEW', 'TIER_1', 'TIER_2', 'BANNED'].map(s => (
                    <button key={s} onClick={() => kycMutation.mutate({ userId: selectedUser, kycStatus: s })} style={{
                      padding: '7px 14px', borderRadius: '8px', border: '1px solid',
                      borderColor: userDetail.user.kyc_status === s ? (KYC_COLOR[s] || 'var(--accent)') : 'var(--glass-border)',
                      background: userDetail.user.kyc_status === s ? `${KYC_COLOR[s] || 'var(--accent)'}18` : 'transparent',
                      color: userDetail.user.kyc_status === s ? (KYC_COLOR[s] || 'var(--accent)') : 'var(--tg-theme-text-color)',
                      fontSize: '12px', cursor: 'pointer', fontWeight: 600,
                    }} disabled={kycMutation.isPending}>
                      {s}
                    </button>
                  ))}
                </div>
                {kycMutation.isSuccess && (
                  <p style={{ color: 'var(--success)', fontSize: '12px', marginTop: '6px' }}>KYC status updated.</p>
                )}
              </div>
            )}

            {/* Wallets */}
            {userDetail.wallets?.filter((w: any) => w.currency === 'NGN').length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, marginBottom: '8px', color: 'var(--tg-theme-hint-color)', letterSpacing: '0.5px' }}>WALLETS</p>
                {userDetail.wallets.filter((w: any) => w.currency === 'NGN').map((w: any) => (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>NGN Wallet</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--success)' }}>{fmtNGN(w.balance)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Cards */}
            {userDetail.cards?.length > 0 && (
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, marginBottom: '8px', color: 'var(--tg-theme-hint-color)', letterSpacing: '0.5px' }}>
                  VIRTUAL CARDS ({userDetail.cards.length})
                </p>
                {userDetail.cards.map((c: any) => (
                  <div key={c.id} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <p style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600 }}>{c.mask_pan}</p>
                        <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)' }}>{c.card_brand} · {c.card_tier}</p>
                      </div>
                      <span className={`badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{c.status}</span>
                    </div>
                    <button
                      onClick={() => freezeMutation.mutate({ cardId: c.id, status: c.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE' })}
                      style={{ width: '100%', padding: '7px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'transparent', color: c.status === 'ACTIVE' ? 'var(--danger)' : 'var(--success)', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
                      disabled={freezeMutation.isPending}>
                      {c.status === 'ACTIVE' ? '❄ Freeze Card' : '⚡ Unfreeze Card'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── TREASURY (finance roles only) ── */}
      {activeSection === 'treasury' && canSeeFinance && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontWeight: 700 }}>Treasury Overview</h3>
            <button onClick={() => refetchTreasury()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}>
              <RefreshCw size={16} />
            </button>
          </div>

          {treasuryLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '14px' }} />)}
            </div>
          ) : treasuryData ? (
            <>
              {/* Status badges */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: treasuryData.sudoConfigured ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', color: treasuryData.sudoConfigured ? 'var(--success)' : 'var(--danger)' }}>
                  {treasuryData.sudoConfigured ? '✓ Sudo Africa live' : '✗ Sudo not configured'}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: treasuryData.paypointConfigured ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', color: treasuryData.paypointConfigured ? 'var(--success)' : 'var(--danger)' }}>
                  {treasuryData.paypointConfigured ? '✓ PayPoint live' : '✗ PayPoint not configured'}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: treasuryData.sweepConfigured ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', color: treasuryData.sweepConfigured ? 'var(--success)' : 'var(--danger)' }}>
                  {treasuryData.sweepConfigured ? '✓ Sweep configured' : '✗ Sweep not configured'}
                </span>
              </div>

              {/* Metric cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div className="glass" style={{ padding: '16px' }}>
                  <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.4px' }}>SUDO FUND ACCOUNT</p>
                  {treasuryData.sudoFundAccount ? (
                    <>
                      <p style={{ fontSize: '18px', fontWeight: 900, color: 'var(--success)' }}>{fmtNGN(treasuryData.sudoFundAccount.available)}</p>
                      <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', marginTop: '2px' }}>Ledger: {fmtNGN(treasuryData.sudoFundAccount.ledger)}</p>
                    </>
                  ) : (
                    <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)', fontStyle: 'italic' }}>—  sandbox / not connected</p>
                  )}
                </div>
                <div className="glass" style={{ padding: '16px' }}>
                  <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.4px' }}>TOTAL WALLET BALANCES</p>
                  <p style={{ fontSize: '18px', fontWeight: 900, color: 'var(--gold)' }}>{fmtNGN(treasuryData.walletExposure)}</p>
                  <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', marginTop: '2px' }}>User-held NGN</p>
                </div>
                <div className="glass" style={{ padding: '16px' }}>
                  <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.4px' }}>ACTIVE CARDS</p>
                  <p style={{ fontSize: '18px', fontWeight: 900 }}>{treasuryData.activeCards}</p>
                  <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', marginTop: '2px' }}>Live virtual cards</p>
                </div>
                <div className="glass" style={{ padding: '16px' }}>
                  <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.4px' }}>MONTHLY CARD EXPOSURE</p>
                  <p style={{ fontSize: '18px', fontWeight: 900, color: 'var(--accent)' }}>{fmtNGN(treasuryData.cardMonthlyExposure)}</p>
                  <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', marginTop: '2px' }}>Sum of monthly limits</p>
                </div>
              </div>

              {/* Sweep section */}
              {adminRole === 'SUPER_ADMIN' && (
                <div className="glass" style={{ padding: '18px', borderRadius: '16px' }}>
                  <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>Sweep PayPoint → Sudo</p>
                  <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)', marginBottom: '14px' }}>
                    Transfer collected NGN from PayPoint to your Sudo fund account to top up card backing.
                  </p>
                  {!treasuryData.sweepConfigured && (
                    <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(244,180,0,0.1)', border: '1px solid rgba(244,180,0,0.25)', marginBottom: '12px' }}>
                      <p style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600 }}>
                        Set SUDO_COLLECTION_ACCOUNT_NUMBER + SUDO_COLLECTION_BANK_CODE to enable live sweeps.
                      </p>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      className="input-field"
                      type="number"
                      placeholder="Amount (₦)"
                      value={sweepAmount}
                      onChange={e => setSweepAmount(e.target.value)}
                      style={{ flex: 1, margin: 0 }}
                    />
                    <button
                      onClick={() => sweepMutation.mutate()}
                      disabled={!sweepAmount || parseFloat(sweepAmount) <= 0 || sweepMutation.isPending}
                      style={{ padding: '0 18px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {sweepMutation.isPending ? 'Sending…' : 'Sweep'}
                    </button>
                  </div>
                  {sweepMutation.isSuccess && (
                    <p style={{ fontSize: '12px', color: 'var(--success)', marginTop: '10px', fontWeight: 600 }}>
                      ✓ Sweep initiated — ref: {sweepMutation.data?.result?.reference}
                    </p>
                  )}
                  {sweepMutation.isError && (
                    <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '10px', fontWeight: 600 }}>
                      {(sweepMutation.error as any)?.response?.data?.error || 'Sweep failed. Check server logs.'}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: '14px' }}>No treasury data available.</p>
          )}
        </div>
      )}
    </div>
  );
}

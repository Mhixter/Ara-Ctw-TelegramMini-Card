import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, BarChart2, BookOpen, Shield, RefreshCw,
  ChevronRight, X, TrendingUp, CreditCard, Activity
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
  PENDING: 'var(--warning)',
  TIER_1:  'var(--gold)',
  TIER_2:  'var(--platinum)',
  BANNED:  'var(--danger)',
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
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'users',    label: 'Users',    icon: Users },
    ...(canSeeFinance ? [{ id: 'ledger', label: 'Ledger', icon: BookOpen }] : []),
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
                        { key: 'email',    label: 'Email',    type: 'email',    placeholder: 'admin@nairavault.com' },
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
            {['', 'PENDING', 'TIER_1', 'TIER_2', 'BANNED'].map(s => (
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
                  {['PENDING', 'TIER_1', 'TIER_2', 'BANNED'].map(s => (
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
    </div>
  );
}

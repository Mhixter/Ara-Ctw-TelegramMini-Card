import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, BarChart2, BookOpen, Shield, Download, RefreshCw, ChevronRight, X } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useTelegram } from '../hooks/useTelegram';

export default function AdminPage() {
  const qc = useQueryClient();
  const { haptic } = useTelegram();
  const [activeSection, setActiveSection] = useState<'overview' | 'users' | 'ledger'>('overview');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', role: 'CUSTOMER_SUPPORT' });
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.stats,
    refetchInterval: 60_000
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', search, kycFilter],
    queryFn: () => adminApi.users({ search, kycStatus: kycFilter }),
    enabled: activeSection === 'users'
  });

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['admin-ledger'],
    queryFn: () => adminApi.ledger({ limit: 50 }),
    enabled: activeSection === 'ledger'
  });

  const { data: userDetail } = useQuery({
    queryKey: ['admin-user-detail', selectedUser],
    queryFn: () => adminApi.userDetail(selectedUser!),
    enabled: !!selectedUser
  });

  const kycMutation = useMutation({
    mutationFn: ({ userId, kycStatus }: { userId: string; kycStatus: string }) =>
      adminApi.updateKyc(userId, kycStatus),
    onSuccess: () => {
      haptic('success');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user-detail', selectedUser] });
    }
  });

  const freezeMutation = useMutation({
    mutationFn: ({ cardId, status }: { cardId: string; status: string }) =>
      adminApi.freezeCard(cardId, status),
    onSuccess: () => {
      haptic('success');
      qc.invalidateQueries({ queryKey: ['admin-user-detail', selectedUser] });
    }
  });

  const createAdminMutation = useMutation({
    mutationFn: () => adminApi.createAdmin(newAdmin),
    onSuccess: () => {
      haptic('success');
      setShowCreateAdmin(false);
      setNewAdmin({ email: '', password: '', role: 'CUSTOMER_SUPPORT' });
    }
  });

  function purposeLabel(p: string) {
    const map: Record<string, string> = {
      WALLET_FUNDING: 'Funded', CARD_ISSUANCE: 'Card Issued',
      CARD_FUNDING: 'Card Fund', MERCHANT_PURCHASE: 'Purchase', FEE_CHARGE: 'Fee'
    };
    return map[p] || p;
  }

  return (
    <div className="page" style={{ paddingTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--tg-theme-hint-color)' }}>Back Office</p>
          <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Admin Console</h1>
        </div>
        <button onClick={() => qc.invalidateQueries()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tg-theme-hint-color)', padding: '8px' }}>
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'overview', label: 'Overview', icon: BarChart2 },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'ledger', label: 'Ledger', icon: BookOpen }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeSection === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveSection(tab.id as any)} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '20px',
              border: '1px solid', borderColor: active ? 'var(--accent)' : 'var(--glass-border)',
              background: active ? 'rgba(108,99,255,0.15)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--tg-theme-hint-color)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
            }}>
              <Icon size={14} />{tab.label}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW */}
      {activeSection === 'overview' && (
        <div>
          {statsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '14px' }} />)}
            </div>
          ) : stats && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div className="glass" style={{ padding: '16px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginBottom: '4px' }}>TOTAL USERS</p>
                  <p style={{ fontSize: '24px', fontWeight: 800 }}>{stats.totalUsers?.toLocaleString()}</p>
                </div>
                <div className="glass" style={{ padding: '16px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginBottom: '4px' }}>ACTIVE CARDS</p>
                  <p style={{ fontSize: '24px', fontWeight: 800 }}>{stats.activeCards}</p>
                </div>
                <div className="glass" style={{ padding: '16px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginBottom: '4px' }}>TOTAL VOLUME</p>
                  <p style={{ fontSize: '20px', fontWeight: 800 }}>${Number(stats.totalVolume || 0).toLocaleString()}</p>
                </div>
                <div className="glass" style={{ padding: '16px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginBottom: '4px' }}>KYC BREAKDOWN</p>
                  {stats.kycBreakdown?.map((k: any) => (
                    <div key={k.kyc_status} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                      <span style={{ color: 'var(--tg-theme-hint-color)' }}>{k.kyc_status}</span>
                      <span style={{ fontWeight: 600 }}>{k.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wallet Balances */}
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Platform Liquidity</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {stats.walletTotals?.map((w: any) => (
                  <div key={w.currency} className="glass" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: w.currency === 'NGN' ? 'rgba(34,197,94,0.15)' : 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '14px' }}>{w.currency === 'NGN' ? '₦' : '$'}</span>
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '13px' }}>{w.currency} Pool</p>
                        <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>Total platform balance</p>
                      </div>
                    </div>
                    <p style={{ fontSize: '16px', fontWeight: 800 }}>
                      {w.currency === 'NGN' ? `₦${Number(w.total).toLocaleString()}` : `$${Number(w.total).toFixed(2)}`}
                    </p>
                  </div>
                ))}
              </div>

              {/* Create Admin */}
              <button className="btn-primary" onClick={() => setShowCreateAdmin(true)} style={{ marginBottom: '12px' }}>
                <Shield size={16} /> Create Admin Account
              </button>

              {showCreateAdmin && (
                <div className="glass" style={{ padding: '20px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h4 style={{ fontWeight: 700 }}>New Admin</h4>
                    <button onClick={() => setShowCreateAdmin(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tg-theme-hint-color)' }}><X size={16} /></button>
                  </div>
                  {[
                    { key: 'email', label: 'Email', type: 'email', placeholder: 'admin@company.com' },
                    { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' }
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginBottom: '4px', display: 'block' }}>{f.label}</label>
                      <input className="input-field" type={f.type} placeholder={f.placeholder}
                        value={(newAdmin as any)[f.key]} onChange={e => setNewAdmin(a => ({ ...a, [f.key]: e.target.value }))} />
                    </div>
                  ))}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)', marginBottom: '4px', display: 'block' }}>Role</label>
                    <select className="input-field" value={newAdmin.role} onChange={e => setNewAdmin(a => ({ ...a, role: e.target.value }))}>
                      {['SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'CUSTOMER_SUPPORT', 'FINANCE_AUDITOR'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <button className="btn-primary" onClick={() => createAdminMutation.mutate()} disabled={createAdminMutation.isPending}>
                    {createAdminMutation.isPending ? 'Creating...' : 'Create'}
                  </button>
                  {createAdminMutation.isError && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '8px' }}>{(createAdminMutation.error as any)?.response?.data?.error}</p>}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* USERS */}
      {activeSection === 'users' && (
        <div>
          <input className="input-field" placeholder="Search by name or email..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ marginBottom: '10px' }} />
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['', 'PENDING', 'TIER_1', 'TIER_2', 'BANNED'].map(s => (
              <button key={s} onClick={() => setKycFilter(s)} style={{
                padding: '6px 12px', borderRadius: '16px', border: '1px solid',
                borderColor: kycFilter === s ? 'var(--accent)' : 'var(--glass-border)',
                background: kycFilter === s ? 'rgba(108,99,255,0.15)' : 'transparent',
                color: kycFilter === s ? 'var(--accent)' : 'var(--tg-theme-hint-color)',
                fontSize: '12px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap'
              }}>{s || 'All'}</button>
            ))}
          </div>

          {usersLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '60px', borderRadius: '12px' }} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {usersData?.users?.map((u: any) => {
                const kycColor = { PENDING: 'var(--warning)', TIER_1: 'var(--gold)', TIER_2: 'var(--platinum)', BANNED: 'var(--danger)' }[u.kyc_status as string] || 'var(--tg-theme-hint-color)';
                return (
                  <div key={u.id} className="glass" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                    onClick={() => setSelectedUser(u.id)}>
                    <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
                      {(u.full_name?.[0] || 'U').toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '13px' }}>{u.full_name || `TG: ${u.telegram_id}`}</p>
                      <p style={{ fontSize: '11px', color: 'var(--tg-theme-hint-color)' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: kycColor }}>{u.kyc_status}</span>
                    </div>
                    <ChevronRight size={14} color="var(--tg-theme-hint-color)" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* LEDGER */}
      {activeSection === 'ledger' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontWeight: 700 }}>Ledger Entries</h3>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
              <Download size={14} /> Export
            </button>
          </div>

          {/* Totals */}
          {ledgerData?.totals && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
              {ledgerData.totals.map((t: any) => (
                <div key={t.purpose} className="glass" style={{ padding: '10px 14px', minWidth: 'fit-content' }}>
                  <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', marginBottom: '2px' }}>{purposeLabel(t.purpose)}</p>
                  <p style={{ fontSize: '14px', fontWeight: 700 }}>${Number(t.total).toFixed(0)}</p>
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
                    <p style={{ fontSize: '12px', fontWeight: 600 }}>{purposeLabel(e.purpose)}</p>
                    <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.transaction_reference}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 700 }}>${Number(e.amount).toFixed(2)}</p>
                    <p style={{ fontSize: '10px', color: 'var(--tg-theme-hint-color)' }}>
                      {new Date(e.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && userDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div className="glass-strong" style={{ width: '100%', maxWidth: '480px', maxHeight: '80vh', overflow: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontWeight: 700 }}>User Details</h3>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tg-theme-hint-color)' }}><X size={18} /></button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontWeight: 700, fontSize: '16px' }}>{userDetail.user.full_name || 'Unknown'}</p>
              <p style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>TG: {userDetail.user.telegram_id}</p>
              <span className={`badge badge-${userDetail.user.kyc_status === 'TIER_2' ? 'platinum' : userDetail.user.kyc_status === 'TIER_1' ? 'gold' : 'pending'}`} style={{ marginTop: '8px', display: 'inline-flex' }}>
                {userDetail.user.kyc_status}
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--tg-theme-hint-color)' }}>UPDATE KYC STATUS</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['PENDING', 'TIER_1', 'TIER_2', 'BANNED'].map(s => (
                  <button key={s} onClick={() => kycMutation.mutate({ userId: selectedUser, kycStatus: s })} style={{
                    padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)',
                    background: userDetail.user.kyc_status === s ? 'rgba(108,99,255,0.2)' : 'transparent',
                    color: 'white', fontSize: '12px', cursor: 'pointer', fontWeight: 500
                  }} disabled={kycMutation.isPending}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {userDetail.wallets?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--tg-theme-hint-color)' }}>WALLETS</p>
                {userDetail.wallets.map((w: any) => (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px' }}>{w.currency}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>
                      {w.currency === 'NGN' ? `₦${Number(w.balance).toLocaleString()}` : `$${Number(w.balance).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {userDetail.cards?.length > 0 && (
              <div>
                <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--tg-theme-hint-color)' }}>CARDS</p>
                {userDetail.cards.map((c: any) => (
                  <div key={c.id} style={{ padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>{c.mask_pan}</span>
                      <span className={`badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{c.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => freezeMutation.mutate({ cardId: c.id, status: c.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE' })}
                        style={{ flex: 1, padding: '6px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'transparent', color: c.status === 'ACTIVE' ? 'var(--danger)' : 'var(--success)', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                        disabled={freezeMutation.isPending}>
                        {c.status === 'ACTIVE' ? 'Freeze' : 'Unfreeze'}
                      </button>
                    </div>
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

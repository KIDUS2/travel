import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api/api';
import type { AdminUser } from '../api/types';
import { useMe } from '../auth/MeProvider';
import { Kpi } from '../components/charts';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { useAsync } from '../lib/useAsync';

const PAGE = 25;

/** Admin-only: everyone who uses Teguwaz, with search, roles and suspension. */
export function AdminUsers() {
  const { me, isAdmin } = useMe();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const summaryQ = useAsync(() => (isAdmin ? api.adminSummary() : Promise.resolve(null)), [isAdmin]);
  const usersQ = useAsync(() => (isAdmin ? api.adminUsers({ query: debounced, page, size: PAGE }) : Promise.resolve(null)), [isAdmin, debounced, page]);

  if (me && !isAdmin) return <Navigate to="/" replace />;

  async function change(u: AdminUser, patch: Partial<Pick<AdminUser, 'role' | 'status'>>, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusyId(u.id); setError(null);
    try {
      await api.adminUpdateUser(u.id, patch);
      await Promise.all([usersQ.reload(), summaryQ.reload()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the user');
    } finally {
      setBusyId(null);
    }
  }

  const s = summaryQ.data;
  const data = usersQ.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;

  return (
    <>
      <PageHeader title="Users" am="ተጠቃሚዎች" subtitle="Everyone using Teguwaz. Sign-in accounts are created in Keycloak; roles and access are managed here." />

      <section className="kpi-strip" aria-label="Summary">
        <Kpi label="Users" value={s ? String(s.users) : '—'} note={s ? `${s.admins} admin${s.admins === 1 ? '' : 's'}` : undefined} />
        <Kpi label="Active, last 7 days" value={s ? String(s.activeLast7Days) : '—'} tone="up" note={s && s.users ? `${Math.round((s.activeLast7Days / s.users) * 100)}% of users` : undefined} />
        <Kpi label="Suspended" value={s ? String(s.suspended) : '—'} />
        <Kpi label="Memories" value={s ? String(s.memories) : '—'} note={s ? `${s.books} books · ${s.channels} channels` : undefined} />
      </section>

      <section className="card card-lg" style={{ overflow: 'hidden', padding: 0 }} aria-labelledby="list">
        <div className="tibeb" />
        <div className="stack" style={{ padding: 20, gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h2 id="list" className="section-title">All users {data ? <span className="muted small" style={{ fontFamily: 'var(--font)', fontWeight: 400 }}>· {data.total}</span> : null}</h2>
            <label className="search" style={{ flex: '0 1 320px' }}>
              <Icon name="search" size={18} />
              <span className="sr-only">Search users</span>
              <input type="search" placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          </div>
          {error ? <div className="banner error" role="alert">{error}</div> : null}
          {usersQ.error ? <div className="banner error">{usersQ.error}</div> : null}

          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Last seen</th>
                  <th style={{ textAlign: 'right' }}>Memories</th><th style={{ textAlign: 'right' }}>Books</th><th style={{ textAlign: 'right' }}>Channels</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((u) => {
                  const self = u.id === me?.id;
                  return (
                    <tr key={u.id} style={u.status === 'SUSPENDED' ? { background: '#FBF4F4' } : undefined}>
                      <td>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span className="avatar" style={{ width: 34, height: 34, fontSize: 14 }}>{(u.displayName ?? u.email ?? '?').charAt(0).toUpperCase()}</span>
                          <div className="stack" style={{ gap: 0 }}>
                            <strong>{u.displayName ?? '—'}{self ? <span className="muted small"> (you)</span> : null}</strong>
                            <span className="muted small">{u.email ?? 'no email'}</span>
                          </div>
                        </div>
                      </td>
                      <td>{u.role === 'ADMIN' ? <span className="tag solid-yellow">Admin</span> : <span className="tag">Traveler</span>}</td>
                      <td>{u.status === 'ACTIVE' ? <span className="tag green">Active</span> : <span className="tag red">Suspended</span>}</td>
                      <td className="small">{new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="small">{u.lastSeenAt ? relative(u.lastSeenAt) : <span className="muted">never</span>}</td>
                      <td style={{ textAlign: 'right' }}>{u.memories}</td>
                      <td style={{ textAlign: 'right' }}>{u.books}</td>
                      <td style={{ textAlign: 'right' }}>{u.channels}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {u.role === 'USER' ? (
                          <button type="button" className="btn" style={btnSm} disabled={busyId === u.id}
                            onClick={() => change(u, { role: 'ADMIN' }, `Make ${u.displayName ?? u.email} an admin? Admins can manage all users.`)}>Make admin</button>
                        ) : (
                          <button type="button" className="btn" style={btnSm} disabled={busyId === u.id || self} title={self ? 'You cannot remove your own admin role' : undefined}
                            onClick={() => change(u, { role: 'USER' }, `Remove admin rights from ${u.displayName ?? u.email}?`)}>Remove admin</button>
                        )}
                        {' '}
                        {u.status === 'ACTIVE' ? (
                          <button type="button" className="btn" style={{ ...btnSm, color: '#8a0c12' }} disabled={busyId === u.id || self} title={self ? 'You cannot suspend yourself' : undefined}
                            onClick={() => change(u, { status: 'SUSPENDED' }, `Suspend ${u.displayName ?? u.email}? They won't be able to use Teguwaz until reactivated. Their data is kept.`)}>Suspend</button>
                        ) : (
                          <button type="button" className="btn btn-primary" style={btnSm} disabled={busyId === u.id}
                            onClick={() => change(u, { status: 'ACTIVE' }, `Reactivate ${u.displayName ?? u.email}?`)}>Reactivate</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data && !data.items.length ? <p className="muted" style={{ margin: 0 }}>No users match "{debounced}".</p> : null}
          {pages > 1 ? (
            <div className="pills" style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
              <button type="button" className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
              <span className="muted small">Page {page + 1} of {pages}</span>
              <button type="button" className="btn" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

const btnSm = { minHeight: 34, padding: '0 10px', fontSize: 13 };

function relative(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

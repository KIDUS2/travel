import { useEffect, useState } from 'react';
import { api } from '../../api/api';
import type { NewTripInvite, Trip, TripInvite, TripMember } from '../../api/types';
import { Icon } from '../../components/Icon';

const ROLE = {
  OWNER: { en: 'Owner', hint: 'Started the trip' },
  EDITOR: { en: 'Can add memories', hint: 'Adds their own photos and stories' },
  VIEWER: { en: 'Can only look', hint: 'Sees the trip, adds nothing' },
} as const;

/** Members of a trip, and invite links for new ones. Owners manage; members can see who is in it and leave. */
export function ShareTrip({ trip, onClose, onLeft }: { trip: Trip; onClose: () => void; onLeft: () => void }) {
  const owner = trip.role === 'OWNER';
  const [members, setMembers] = useState<TripMember[]>([]);
  const [invites, setInvites] = useState<TripInvite[]>([]);
  const [fresh, setFresh] = useState<NewTripInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setMembers(await api.tripMembers(trip.id));
      if (owner) setInvites(await api.tripInvites(trip.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load members');
    }
  };
  useEffect(() => { void load(); }, [trip.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const link = fresh ? `${window.location.origin}/join/${fresh.token}` : '';

  async function makeLink(role: 'EDITOR' | 'VIEWER') {
    setBusy(true); setError(null); setCopied(false);
    try {
      setFresh(await api.createInvite(trip.id, role));
      setInvites(await api.tripInvites(trip.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not make a link');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); }
  }

  async function share() {
    const text = `Join "${trip.name}" on Teguwaz and add your photos from the trip.`;
    if (navigator.share) {
      try { await navigator.share({ title: trip.name, text, url: link }); } catch { /* cancelled */ }
    } else {
      await copy();
    }
  }

  async function act(fn: () => Promise<void>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setError(null);
    try { await fn(); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); } finally { setBusy(false); }
  }

  const me = members.find((m) => m.you);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="st-title" style={{ width: 'min(620px, 100%)' }}>
        <div className="tibeb" />
        <div className="stack" style={{ padding: 24, gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 id="st-title" className="section-title" style={{ fontSize: 22 }}>{owner ? 'Share this trip' : 'Trip members'} <span className="am">· {owner ? 'ጉዞውን አጋራ' : 'አባላት'}</span></h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Everyone in <strong style={{ color: 'var(--ink)' }}>{trip.name}</strong> sees each other's <strong style={{ color: 'var(--ink)' }}>Family</strong> and <strong style={{ color: 'var(--ink)' }}>Public</strong> memories in this trip. "Only me" memories stay private. People can change only their own memories.
          </p>
          {error ? <div className="banner error">{error}</div> : null}

          {owner ? (
            <section className="stack share-invite" style={{ gap: 10 }} aria-label="Invite people">
              <strong>Invite with a link</strong>
              <div className="pills">
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void makeLink('EDITOR')}><Icon name="link" size={18} />Link: can add memories</button>
                <button type="button" className="btn" disabled={busy} onClick={() => void makeLink('VIEWER')}>Link: can only look</button>
              </div>
              {fresh ? (
                <div className="stack" style={{ gap: 8 }}>
                  <div className="share-link">
                    <input className="input" readOnly value={link} aria-label="Invite link" onFocus={(e) => e.target.select()} />
                    <button type="button" className="btn" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</button>
                    <button type="button" className="btn btn-yellow" onClick={() => void share()}><Icon name="share" size={18} />Send</button>
                  </div>
                  <span className="muted small">Send it on Telegram, WhatsApp or SMS. Anyone with the link can join as "{ROLE[fresh.role].en.toLowerCase()}" for 14 days, after signing in.</span>
                </div>
              ) : null}
              {invites.length ? (
                <ul className="share-list">
                  {invites.map((i) => (
                    <li key={i.id}>
                      <span className="stack" style={{ gap: 2, flex: 1 }}>
                        <span>Link · {ROLE[i.role].en}</span>
                        <span className="muted small">Used {i.uses} time{i.uses === 1 ? '' : 's'} · works until {new Date(i.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </span>
                      <button type="button" className="btn" style={{ minHeight: 36 }} disabled={busy}
                        onClick={() => void act(async () => { await api.revokeInvite(trip.id, i.id); if (fresh?.id === i.id) setFresh(null); }, 'Turn this link off? People who already joined stay in the trip.')}>Turn off</button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          <section className="stack" style={{ gap: 8 }} aria-label="Members">
            <strong>{members.length} {members.length === 1 ? 'person' : 'people'}</strong>
            <ul className="share-list">
              {members.map((m) => (
                <li key={m.userId}>
                  <span className="avatar small-avatar" aria-hidden="true">{m.name.charAt(0).toUpperCase()}</span>
                  <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                    <span className="ellipsis">{m.name}{m.you ? ' (you)' : ''}</span>
                    <span className="muted small">{ROLE[m.role].en}</span>
                  </span>
                  {owner && m.role !== 'OWNER' ? (
                    <>
                      <select className="select" style={{ width: 'auto', minHeight: 36 }} value={m.role} disabled={busy} aria-label={`Role for ${m.name}`}
                        onChange={(e) => void act(() => api.changeMemberRole(trip.id, m.userId, e.target.value as 'EDITOR' | 'VIEWER'))}>
                        <option value="EDITOR">Can add memories</option>
                        <option value="VIEWER">Can only look</option>
                      </select>
                      <button type="button" className="icon-btn" aria-label={`Remove ${m.name}`} disabled={busy}
                        onClick={() => void act(() => api.removeMember(trip.id, m.userId), `Remove ${m.name} from the trip? Their memories stay theirs but leave this trip.`)}>
                        <Icon name="trash" size={17} />
                      </button>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          {!owner && me ? (
            <div className="pills" style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <button type="button" className="btn btn-danger" disabled={busy}
                onClick={() => void act(async () => { await api.removeMember(trip.id, me.userId); onLeft(); }, `Leave "${trip.name}"? Your memories stay in your vault but leave this trip.`)}>Leave trip</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/api';
import type { InvitePreview } from '../api/types';
import { Icon } from '../components/Icon';

/** Opened from an invite link: shows the trip and joins it. */
export function JoinTrip() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.invitePreview(token).then(setPreview).catch(() => setError('This invite link does not work. It may be mistyped, or the trip owner turned it off.'));
  }, [token]);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const { tripId } = await api.acceptInvite(token);
      navigate(`/memories?trip=${tripId}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join the trip');
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
      <div className="card card-lg" style={{ width: 'min(480px, 100%)', overflow: 'hidden', padding: 0 }}>
        <div className="tibeb" />
        <div className="stack" style={{ padding: 28, gap: 14 }}>
          <span className="tag green" style={{ alignSelf: 'flex-start' }}><Icon name="users" size={14} />Trip invite</span>
          {error ? <div className="banner error">{error}</div> : null}
          {preview ? (
            <>
              <h1 className="section-title" style={{ fontSize: 26 }}>{preview.tripName}</h1>
              <p style={{ margin: 0 }}>
                {preview.ownerName ?? 'A traveler'} invited you to {preview.role === 'EDITOR' ? 'add your photos and stories to this trip' : 'see this trip'}.
              </p>
              <p className="muted small" style={{ margin: 0 }}>
                You will see the trip's Family and Public memories. {preview.role === 'EDITOR' ? 'What you add stays yours; you choose who sees each memory.' : ''}
              </p>
              {preview.expired ? <div className="banner info">This link has expired. Ask {preview.ownerName ?? 'the owner'} for a new one.</div> : null}
              {preview.alreadyMember ? (
                <Link to={`/memories?trip=${preview.tripId}`} className="btn btn-primary">You are in this trip · Open it</Link>
              ) : (
                <button type="button" className="btn btn-primary" disabled={busy || preview.expired} onClick={() => void join()}>
                  {busy ? 'Joining…' : 'Join the trip'}
                </button>
              )}
            </>
          ) : !error ? <p className="muted">Opening the invite…</p> : null}
        </div>
      </div>
    </div>
  );
}

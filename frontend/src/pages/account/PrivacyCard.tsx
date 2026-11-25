import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api';
import type { Privacy } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { Icon } from '../../components/Icon';
import { config } from '../../config';
import { loadDefaultPrivacy, rememberDefaultPrivacy } from '../../lib/defaultPrivacy';
import { clearOfflineData } from '../../offline/pwa';
import { PRIVACY_LABEL, PRIVACY_ORDER } from '../memories/privacy';

/** Default visibility, data export and account deletion. */
export function PrivacyCard() {
  const [privacy, setPrivacy] = useState<Privacy | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void loadDefaultPrivacy().then(setPrivacy); }, []);

  async function choose(p: Privacy) {
    setPrivacy(p);
    setError(null);
    try {
      await api.updatePrivacySettings({ defaultPrivacy: p });
      rememberDefaultPrivacy(p);
      setSavedNote(`New memories are now "${PRIVACY_LABEL[p].en}" unless you choose otherwise.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    }
  }

  async function download() {
    setExporting(true);
    setError(null);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `teguwaz-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not export');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="card card-pad stack" aria-labelledby="priv" style={{ gap: 14 }}>
      <h2 id="priv" className="section-title" style={{ fontSize: 18 }}>Privacy &amp; your data <span className="am">· ግላዊነት</span></h2>
      {error ? <div className="banner error">{error}</div> : null}

      <div className="field" style={{ gap: 8 }}>New memories are visible to
        <div className="pills" role="radiogroup" aria-label="Default visibility">
          {PRIVACY_ORDER.map((p) => (
            <button key={p} type="button" role="radio" className="pill" aria-checked={privacy === p} disabled={!privacy} onClick={() => void choose(p)}>
              {PRIVACY_LABEL[p].en} · <span className="am">{PRIVACY_LABEL[p].am}</span>
            </button>
          ))}
        </div>
        <span className="muted small" style={{ fontWeight: 400 }}>{savedNote ?? 'You can still change each memory on its own. Teguwaz never posts anything for you.'}</span>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <button type="button" className="btn" onClick={() => void download()} disabled={exporting}>
          <Icon name="download" size={18} />{exporting ? 'Preparing…' : 'Download all my data'}
        </button>
        <span className="muted small">One file with your profile, trips, memories, books and channels, plus links to download every photo.</span>
      </div>

      <div className="danger-zone stack" style={{ gap: 8 }}>
        <strong>Delete my account</strong>
        <span className="small">Removes every memory, photo, book and channel connection, permanently.</span>
        <button type="button" className="btn btn-danger" onClick={() => setDeleting(true)}>Delete my account…</button>
      </div>

      <span className="small"><Link to="/privacy">Privacy policy</Link> · <Link to="/terms">Terms of use</Link></span>

      {deleting ? <DeleteAccountDialog onClose={() => setDeleting(false)} /> : null}
    </section>
  );
}

function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const { logout } = useAuth();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ signInDeleted: boolean } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.deleteAccount(typed.trim());
      await clearOfflineData();
      setDone(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the account');
      setBusy(false);
    }
  }

  const finish = () => {
    if (config.demoMode) { window.location.assign('/welcome'); return; }
    logout();
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && !done && onClose()}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="del-title" style={{ width: 'min(480px, 100%)' }}>
        <div className="stack" style={{ padding: 24, gap: 14 }}>
          {done ? (
            <>
              <h2 id="del-title" className="section-title" style={{ fontSize: 22 }}>Your account is deleted</h2>
              <p className="muted" style={{ margin: 0 }}>
                Your memories, photos, books and channel connections are gone.
                {done.signInDeleted ? ' Your sign-in was removed too.' : ' Your sign-in still exists; you can remove it from your sign-in account settings.'}
                {' '}Thank you for traveling with Teguwaz.
              </p>
              <button type="button" className="btn btn-primary" onClick={finish}>Close</button>
            </>
          ) : (
            <>
              <h2 id="del-title" className="section-title" style={{ fontSize: 22 }}>Delete your account?</h2>
              <p style={{ margin: 0 }}>This permanently deletes all your memories, photos, trips, books and channel connections. It cannot be undone.</p>
              <p className="muted small" style={{ margin: 0 }}>Want a copy first? Close this and use "Download all my data".</p>
              {error ? <div className="banner error">{error}</div> : null}
              <label className="field">Type DELETE to confirm
                <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
              </label>
              <div className="pills" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={onClose} disabled={busy}>Keep my account</button>
                <button type="button" className="btn btn-danger" disabled={typed.trim() !== 'DELETE' || busy} onClick={() => void confirm()}>
                  {busy ? 'Deleting…' : 'Delete forever'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

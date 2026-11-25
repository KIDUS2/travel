import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useConnection } from './network';
import { removePending, syncOutbox, useOutbox, type PendingMemory } from './outbox';
import { getUploadSettings, onUploadSettingsChange, setUploadSettings, type UploadSettings } from './settings';

function useUploadSettings(): UploadSettings {
  const [s, setS] = useState(getUploadSettings);
  useEffect(() => onUploadSettingsChange(() => setS(getUploadSettings())), []);
  return s;
}

function sizeLabel(bytes: number) {
  return bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

/** Thin strip at the top of every page: offline, waiting for Wi-Fi, or uploading. */
export function ConnectionBanner() {
  const conn = useConnection();
  const { items, syncing, block, progress } = useOutbox();
  const waiting = items.length;
  if (conn === 'offline') {
    return (
      <div className="conn-banner offline" role="status">
        <strong>You're offline.</strong> Keep saving memories; they stay on this phone{waiting ? ` (${waiting} waiting)` : ''} and upload when you're back online.
      </div>
    );
  }
  if (syncing && progress) {
    return <div className="conn-banner syncing" role="status">Uploading your memories… {waiting} left</div>;
  }
  if (waiting && block === 'waiting-for-wifi') {
    return (
      <div className="conn-banner wifi" role="status">
        <span>{waiting} memor{waiting === 1 ? 'y is' : 'ies are'} waiting for Wi-Fi.</span>
        <button type="button" className="btn" onClick={() => void syncOutbox(true)}>Upload now on mobile data</button>
      </div>
    );
  }
  return null;
}

/** List of memories saved on this device that have not reached the server yet. */
export function PendingUploads() {
  const { items, syncing, block, progress } = useOutbox();
  const urls = useMemo(() => new Map<string, string>(), []);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  if (!items.length) return null;

  const thumb = (m: PendingMemory) => {
    const f = m.files.find((x) => x.type.startsWith('image/'));
    if (!f) return undefined;
    let u = urls.get(m.clientId);
    if (!u) { u = URL.createObjectURL(f.blob); urls.set(m.clientId, u); }
    return u;
  };
  const status = (m: PendingMemory) => {
    if (m.error) return { text: `Could not upload: ${m.error}`, tone: 'error' };
    if (progress?.clientId === m.clientId) return { text: `Uploading ${progress.done + 1} of ${progress.total}`, tone: 'ok' };
    if (block === 'offline') return { text: 'Saved on this phone · waiting for a connection', tone: 'wait' };
    if (block === 'waiting-for-wifi') return { text: 'Saved on this phone · waiting for Wi-Fi', tone: 'wait' };
    return { text: syncing ? 'In the queue' : 'Waiting to upload', tone: 'wait' };
  };
  const totalBytes = items.reduce((n, m) => n + m.files.slice(m.uploaded).reduce((k, f) => k + f.blob.size, 0), 0);

  return (
    <section className="card card-pad stack pending" aria-labelledby="pending-title" style={{ gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 id="pending-title" className="section-title" style={{ fontSize: 18 }}>
          On this phone, not uploaded yet <span className="am">· ያልተላኩ</span>
        </h2>
        <div className="pills">
          <span className="muted small">{items.length} memor{items.length === 1 ? 'y' : 'ies'} · {sizeLabel(totalBytes)}</span>
          <button type="button" className="btn" disabled={syncing || block === 'offline'} onClick={() => void syncOutbox(true)}>
            {block === 'waiting-for-wifi' ? 'Upload on mobile data' : 'Upload now'}
          </button>
        </div>
      </div>
      <ul className="pending-list">
        {items.map((m) => {
          const s = status(m);
          const t = thumb(m);
          return (
            <li key={m.clientId}>
              <span className="thumb" style={t ? { backgroundImage: `url(${t})` } : undefined} />
              <span className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                <strong className="ellipsis">{m.input.title}</strong>
                <span className={`small pending-${s.tone}`}>{s.text}</span>
              </span>
              <span className="muted small">{m.files.length} file{m.files.length === 1 ? '' : 's'}</span>
              <button type="button" className="icon-btn" aria-label={`Discard ${m.input.title}`} title="Discard from this phone"
                onClick={() => { if (window.confirm(`Discard "${m.input.title}"? It has not been uploaded, so it will be lost.`)) void removePending(m.clientId); }}>
                <Icon name="trash" size={17} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Account page card: when to upload and how much data to use. */
export function UploadSettingsCard() {
  const s = useUploadSettings();
  return (
    <section className="card card-pad stack" aria-labelledby="upl" style={{ gap: 12 }}>
      <h2 id="upl" className="section-title" style={{ fontSize: 18 }}>Uploads &amp; data <span className="am">· ዳታ</span></h2>
      <div className="field" style={{ gap: 8 }}>Upload photos
        <div className="pills" role="radiogroup" aria-label="When to upload">
          <button type="button" role="radio" className="pill" aria-checked={s.policy === 'any'} onClick={() => setUploadSettings({ policy: 'any' })}>On any connection</button>
          <button type="button" role="radio" className="pill" aria-checked={s.policy === 'wifi'} onClick={() => setUploadSettings({ policy: 'wifi' })}>Only on Wi-Fi</button>
        </div>
        <span className="muted small" style={{ fontWeight: 400 }}>
          {s.policy === 'wifi'
            ? 'On mobile data, new memories wait on this phone and upload when you join Wi-Fi. Android Chrome can tell Wi-Fi from mobile data; on other browsers uploads go ahead.'
            : 'Memories upload as soon as there is a connection.'}
        </span>
      </div>
      <label className="check-row">
        <input type="checkbox" checked={s.dataSaver} onChange={(e) => setUploadSettings({ dataSaver: e.target.checked })} />
        <span>
          <strong>Data saver</strong>
          <span className="muted small" style={{ display: 'block' }}>Shrink photos to 2048 px before upload. Uses about 5–10× less data, still sharp enough for a printed book page. It also removes the hidden GPS data from the uploaded file.</span>
        </span>
      </label>
    </section>
  );
}

interface InstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/** "Install Teguwaz" when the browser offers it (Android Chrome, desktop Chrome/Edge). */
export function InstallAppCard() {
  const [evt, setEvt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches ?? false);
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallPromptEvent); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return (
    <section className="card card-pad stack" aria-labelledby="inst" style={{ gap: 10 }}>
      <h2 id="inst" className="section-title" style={{ fontSize: 18 }}>Teguwaz on your phone</h2>
      {installed ? <span className="muted">Installed. Open Teguwaz from your home screen; it works offline too.</span> : (
        <>
          <span className="muted small">Install it like an app: it opens from your home screen and works without a connection.</span>
          {evt ? (
            <button type="button" className="btn btn-primary" onClick={() => { void evt.prompt(); void evt.userChoice.then(() => setEvt(null)); }}>Install Teguwaz</button>
          ) : (
            <span className="small">{ios ? 'On iPhone: tap Share, then "Add to Home Screen".' : 'In Chrome: open the menu (⋮) and choose "Install app" or "Add to Home screen".'}</span>
          )}
        </>
      )}
    </section>
  );
}

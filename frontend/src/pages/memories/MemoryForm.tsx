import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../../api/api';
import { ApiError } from '../../api/client';
import type { Memory, Privacy, Trip } from '../../api/types';
import { Icon } from '../../components/Icon';
import { useDefaultPrivacy } from '../../lib/defaultPrivacy';
import { readPhotoMeta } from '../../lib/photoMeta';
import { prepareForUpload } from '../../offline/compress';
import { uploadBlock } from '../../offline/network';
import { enqueueMemory } from '../../offline/outbox';
import { ETHIOPIA_REGIONS, regionName } from '../../lib/regions';
import { PRIVACY_LABEL, PRIVACY_ORDER } from './privacy';

function localDateTimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MemoryForm({ trips, defaultTripId, existing, onClose, onSaved, onQueued }: {
  trips: Trip[];
  defaultTripId?: string;
  existing?: Memory;
  onClose: () => void;
  onSaved: (m: Memory) => void;
  /** Saved on this device because there is no connection (or Wi-Fi-only on mobile data). */
  onQueued?: () => void;
}) {
  const [clientId] = useState(() => existing?.clientId ?? crypto.randomUUID());
  const [title, setTitle] = useState(existing?.title ?? '');
  const [story, setStory] = useState(existing?.story ?? '');
  const [placeName, setPlaceName] = useState(existing?.placeName ?? '');
  const [regionCode, setRegionCode] = useState(existing?.regionCode ?? '');
  const [tripId, setTripId] = useState(existing?.tripId ?? defaultTripId ?? '');
  const [happenedAt, setHappenedAt] = useState(localDateTimeValue(existing ? new Date(existing.happenedAt) : new Date()));
  const [privacy, setPrivacy] = useState<Privacy>(existing?.privacy ?? 'PRIVATE');
  useDefaultPrivacy(setPrivacy, !!existing);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    existing?.latitude != null && existing?.longitude != null ? { lat: existing.latitude, lng: existing.longitude } : null,
  );
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [autoFill, setAutoFill] = useState<{ text: string; undo: () => void } | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Location is not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError('Could not get your location. You can still save without it.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  /** Fills place, region, GPS and date from the first photo that has EXIF data, without overwriting what the traveler typed. */
  async function pickFiles(list: File[]) {
    setFiles(list);
    setAutoFill(null);
    if (existing) return;
    for (const f of list.filter((x) => x.type.startsWith('image/')).slice(0, 10)) {
      const meta = await readPhotoMeta(f);
      if (!meta.takenAt && meta.lat == null) continue;
      const before = { placeName, regionCode, coords, happenedAt };
      const parts: string[] = [];
      if (meta.lat != null && meta.lng != null && !coords) {
        setCoords({ lat: meta.lat, lng: meta.lng });
        if (!placeName.trim() && meta.place?.placeName) { setPlaceName(meta.place.placeName); parts.push(meta.place.placeName); }
        if (!regionCode && meta.place?.regionCode) {
          setRegionCode(meta.place.regionCode);
          const r = regionName(meta.place.regionCode);
          if (r) parts.push(r.en);
        }
        if (!parts.length) parts.push('GPS location');
      }
      if (meta.takenAt) {
        setHappenedAt(localDateTimeValue(meta.takenAt));
        parts.push(meta.takenAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
      }
      if (parts.length) {
        setAutoFill({
          text: `Filled from your photo: ${parts.join(' · ')}`,
          undo: () => {
            setPlaceName(before.placeName); setRegionCode(before.regionCode); setCoords(before.coords); setHappenedAt(before.happenedAt);
            setAutoFill(null);
          },
        });
      }
      return;
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    const input = {
      clientId,
      tripId: tripId || null,
      title: title.trim(),
      story: story.trim() || null,
      placeName: placeName.trim() || null,
      regionCode: regionCode || null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      happenedAt: new Date(happenedAt).toISOString(),
      privacy,
    };
    // New memories never get lost: without a usable connection they wait in the outbox.
    if (!existing && uploadBlock()) {
      await enqueueMemory(input, files);
      setBusy(false);
      (onQueued ?? onClose)();
      return;
    }
    let uploaded = 0;
    try {
      let saved = existing ? await api.updateMemory(existing.id, input) : await api.createMemory(input);
      for (const f of files) {
        await api.uploadMedia(saved.id, await prepareForUpload(f));
        uploaded += 1;
      }
      if (files.length) saved = await api.getMemory(saved.id);
      onSaved(saved);
    } catch (err) {
      if (!existing && err instanceof TypeError) {
        // The connection dropped: keep the rest on this device (creating again is safe, it reuses clientId).
        await enqueueMemory(input, files.slice(uploaded));
        (onQueued ?? onClose)();
        return;
      }
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fields);
      } else {
        setError(existing ? 'Editing needs a connection. Try again when you are online.' : 'Could not save. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mf-title">
        <div className="tibeb" />
        <form onSubmit={submit} className="stack" style={{ padding: 24, gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 id="mf-title" className="section-title" style={{ fontSize: 24 }}>
              {existing ? 'Edit memory' : 'New memory'} <span className="am">· {existing ? 'ትዝታ አስተካክል' : 'አዲስ ትዝታ'}</span>
            </h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
          </div>

          {error ? <div className="banner error">{error}</div> : null}

          <label className="field">Photos, videos or voice notes <span className="muted small" style={{ fontWeight: 400 }}>· add photos first and Teguwaz fills in the place and date</span>
            <input className="input" type="file" multiple accept="image/*,video/*,audio/*" style={{ paddingTop: 10 }}
              onChange={(e) => void pickFiles(Array.from(e.target.files ?? []))} />
            {files.length ? <span className="muted small" style={{ fontWeight: 400 }}>{files.length} file(s) will be uploaded</span> : null}
          </label>
          {autoFill ? (
            <div className="banner success" role="status" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <span><Icon name="pin" size={16} /> {autoFill.text}</span>
              <button type="button" className="btn" style={{ minHeight: 34 }} onClick={autoFill.undo}>Undo</button>
            </div>
          ) : null}

          <label className="field">Title
            <input ref={titleRef} className="input" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Bete Giyorgis at sunrise" aria-invalid={!!fieldErrors.title} />
            {fieldErrors.title ? <span className="small" style={{ color: '#8a0c12' }}>{fieldErrors.title}</span> : null}
          </label>

          <label className="field">Your story
            <textarea className="textarea" value={story} onChange={(e) => setStory(e.target.value)} maxLength={20000}
              placeholder="What happened, who was with you, how it felt…" />
          </label>

          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label className="field">Place
              <input className="input" value={placeName} onChange={(e) => setPlaceName(e.target.value)} placeholder="Lalibela" maxLength={200} />
            </label>
            <label className="field">Region
              <select className="select" value={regionCode} onChange={(e) => setRegionCode(e.target.value)}>
                <option value="">Choose region</option>
                {ETHIOPIA_REGIONS.map((r) => <option key={r.code} value={r.code}>{r.en} · {r.am}</option>)}
              </select>
            </label>
            <label className="field">When
              <input className="input" type="datetime-local" required value={happenedAt} onChange={(e) => setHappenedAt(e.target.value)} />
            </label>
          </div>

          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label className="field">Trip
              <select className="select" value={tripId} onChange={(e) => setTripId(e.target.value)}>
                <option value="">No trip</option>
                {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <div className="field">GPS location
              <button type="button" className="btn" onClick={useMyLocation}>
                <Icon name="pin" size={18} />{coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Use my location'}
              </button>
            </div>
          </div>

          <div className="field">Who can see this? <span className="am muted" style={{ fontWeight: 500 }}>ማን ያያል?</span>
            <div className="pills" role="radiogroup" aria-label="Privacy">
              {PRIVACY_ORDER.map((p) => (
                <button key={p} type="button" role="radio" className="pill" aria-checked={privacy === p} onClick={() => setPrivacy(p)}>
                  {PRIVACY_LABEL[p].en} · <span className="am">{PRIVACY_LABEL[p].am}</span>
                </button>
              ))}
            </div>
            <span className="muted small" style={{ fontWeight: 400 }}>{PRIVACY_LABEL[privacy].hint}</span>
          </div>

          <div className="pills" style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save memory'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

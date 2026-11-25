import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/api';
import type { Privacy, Trip } from '../../api/types';
import { Icon } from '../../components/Icon';
import { groupPhotos, readPhotoMeta, suggestTitle, type PhotoGroup } from '../../lib/photoMeta';
import { regionName } from '../../lib/regions';
import { prepareForUpload } from '../../offline/compress';
import { uploadBlock } from '../../offline/network';
import { enqueueMemory } from '../../offline/outbox';
import { PRIVACY_LABEL, PRIVACY_ORDER } from './privacy';

interface Draft {
  group: PhotoGroup;
  title: string;
  include: boolean;
}

const NEW_TRIP = '__new__';

/**
 * Import many photos at once. Teguwaz reads each photo's date and GPS,
 * groups them into one memory per day and place, and names the place.
 */
export function PhotoImport({ trips, onClose, onDone, onQueued }: { trips: Trip[]; onClose: () => void; onDone: (tripId: string | null) => void; onQueued?: () => void }) {
  const [reading, setReading] = useState<{ done: number; total: number } | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [tripId, setTripId] = useState<string>(NEW_TRIP);
  const [tripName, setTripName] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('PRIVATE');
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previews = useMemo(() => new Map<File, string>(), []);

  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const preview = (f: File) => {
    let u = previews.get(f);
    if (!u) { u = URL.createObjectURL(f); previews.set(f, u); }
    return u;
  };

  async function pick(list: File[]) {
    const files = list.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!files.length) return;
    setError(null);
    setReading({ done: 0, total: files.length });
    const metas = [];
    for (const f of files) {
      metas.push(await readPhotoMeta(f));
      setReading((r) => r && { ...r, done: r.done + 1 });
    }
    const groups = groupPhotos(metas);
    setDrafts(groups.map((g) => ({ group: g, title: suggestTitle(g), include: true })));
    const places = [...new Set(groups.map((g) => g.place?.placeName).filter(Boolean))];
    const first = groups.find((g) => g.start)?.start;
    setTripName(places.length ? (places.length > 2 ? `${places[0]}, ${places[1]} and more` : places.join(' & ')) : first ? `Trip, ${first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}` : 'New trip');
    setReading(null);
  }

  const chosen = drafts.filter((d) => d.include);
  const photoCount = chosen.reduce((n, d) => n + d.group.photos.length, 0);

  const days = () => chosen.map((d) => d.group.day).filter((d) => d !== 'unknown').sort();
  const memoryInput = (d: Draft, tripIdValue: string | null) => ({
    clientId: crypto.randomUUID(),
    tripId: tripIdValue,
    title: d.title.trim() || 'Photos',
    placeName: d.group.place?.placeName ?? null,
    regionCode: d.group.place?.regionCode ?? null,
    latitude: d.group.lat,
    longitude: d.group.lng,
    happenedAt: (d.group.start ?? new Date()).toISOString(),
    privacy,
  });

  /** Keeps memories on this device until they can upload (offline, or Wi-Fi only on mobile data). */
  async function queue(from: number, tripIdValue: string | null, firstFilesDone = 0, createdInputs: Map<number, ReturnType<typeof memoryInput>> = new Map()) {
    const newTrip = tripIdValue == null && tripId === NEW_TRIP
      ? { key: crypto.randomUUID(), input: { name: tripName.trim() || 'New trip', startDate: days()[0] ?? null, endDate: days()[days().length - 1] ?? null } }
      : undefined;
    for (let i = from; i < chosen.length; i++) {
      const input = createdInputs.get(i) ?? memoryInput(chosen[i], tripIdValue ?? (tripId === NEW_TRIP ? null : tripId || null));
      const files = chosen[i].group.photos.map((p) => p.file).slice(i === from ? firstFilesDone : 0);
      await enqueueMemory(input, files, newTrip);
    }
    (onQueued ?? onClose)();
  }

  async function save() {
    setError(null);
    if (uploadBlock()) {
      setSaving({ done: 0, total: photoCount });
      await queue(0, null);
      return;
    }
    setSaving({ done: 0, total: photoCount });
    let targetTrip: string | null = tripId === NEW_TRIP ? null : tripId || null;
    let index = 0;
    let filesDone = 0;
    const inputs = new Map<number, ReturnType<typeof memoryInput>>();
    try {
      if (tripId === NEW_TRIP) {
        const trip = await api.createTrip({ name: tripName.trim() || 'New trip', startDate: days()[0] ?? null, endDate: days()[days().length - 1] ?? null });
        targetTrip = trip.id;
      }
      for (index = 0; index < chosen.length; index++) {
        const input = memoryInput(chosen[index], targetTrip);
        inputs.set(index, input);
        filesDone = 0;
        const memory = await api.createMemory(input);
        for (const p of chosen[index].group.photos) {
          await api.uploadMedia(memory.id, await prepareForUpload(p.file));
          filesDone += 1;
          setSaving((s) => s && { ...s, done: s.done + 1 });
        }
      }
      onDone(targetTrip);
    } catch (e) {
      if (e instanceof TypeError) {
        await queue(index, targetTrip, filesDone, inputs);
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setSaving(null);
    }
  }

  const located = drafts.filter((d) => d.group.lat != null).length;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="pi-title" style={{ width: 'min(820px, 100%)' }}>
        <div className="tibeb" />
        <div className="stack" style={{ padding: 24, gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 id="pi-title" className="section-title" style={{ fontSize: 24 }}>Import photos <span className="am">· ፎቶዎችን አስገባ</span></h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose} disabled={!!saving}><Icon name="x" /></button>
          </div>

          {error ? <div className="banner error">{error}</div> : null}

          {!drafts.length ? (
            <label className="import-drop">
              <input type="file" multiple accept="image/*,video/*" className="sr-only" onChange={(e) => void pick(Array.from(e.target.files ?? []))} />
              <Icon name="photo" size={34} />
              <strong>{reading ? `Reading photos… ${reading.done} of ${reading.total}` : 'Choose photos from your phone or computer'}</strong>
              <span className="muted small">Teguwaz reads when and where each photo was taken and makes one memory per day and place. Nothing is uploaded until you save.</span>
            </label>
          ) : (
            <>
              <p className="muted" style={{ margin: 0 }}>
                {drafts.length} memor{drafts.length === 1 ? 'y' : 'ies'} from {drafts.reduce((n, d) => n + d.group.photos.length, 0)} photos
                {located < drafts.length ? ` · ${drafts.length - located} without a location (your camera may have location turned off)` : ''}.
                Rename or untick any before saving.
              </p>
              <ul className="import-list">
                {drafts.map((d, i) => {
                  const r = regionName(d.group.place?.regionCode);
                  return (
                    <li key={d.group.key} className={`import-item${d.include ? '' : ' off'}`}>
                      <input type="checkbox" checked={d.include} aria-label={`Include ${d.title}`}
                        onChange={(e) => setDrafts((ds) => ds.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))} />
                      <div className="import-thumbs">
                        {d.group.photos.slice(0, 3).map((p, k) => (
                          p.file.type.startsWith('image/') ? <img key={k} src={preview(p.file)} alt="" /> : <span key={k} className="import-video"><Icon name="photo" size={18} /></span>
                        ))}
                        {d.group.photos.length > 3 ? <span className="import-more">+{d.group.photos.length - 3}</span> : null}
                      </div>
                      <div className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                        <input className="input" value={d.title} maxLength={200} aria-label="Memory title"
                          onChange={(e) => setDrafts((ds) => ds.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                        <span className="muted small">
                          {d.group.start ? d.group.start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}
                          {' · '}{d.group.place?.placeName ?? (d.group.lat != null ? 'GPS location' : 'No location')}
                          {r ? ` · ${r.en} (${r.am})` : ''}
                          {' · '}{d.group.photos.length} file{d.group.photos.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                <label className="field">Add to trip
                  <select className="select" value={tripId} onChange={(e) => setTripId(e.target.value)}>
                    <option value={NEW_TRIP}>New trip…</option>
                    {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    <option value="">No trip</option>
                  </select>
                </label>
                {tripId === NEW_TRIP ? (
                  <label className="field">Trip name
                    <input className="input" value={tripName} maxLength={160} onChange={(e) => setTripName(e.target.value)} />
                  </label>
                ) : null}
              </div>

              <div className="field">Who can see these?
                <div className="pills" role="radiogroup" aria-label="Privacy">
                  {PRIVACY_ORDER.map((p) => (
                    <button key={p} type="button" role="radio" className="pill" aria-checked={privacy === p} onClick={() => setPrivacy(p)}>
                      {PRIVACY_LABEL[p].en} · <span className="am">{PRIVACY_LABEL[p].am}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="pills" style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: 16, alignItems: 'center' }}>
            {saving ? <span className="muted small" style={{ marginRight: 'auto' }}>Uploading {saving.done} of {saving.total}…</span> : null}
            {drafts.length && !saving ? <button type="button" className="btn" onClick={() => setDrafts([])}>Choose other photos</button> : null}
            <button type="button" className="btn" onClick={onClose} disabled={!!saving}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={!chosen.length || !!saving} onClick={() => void save()}>
              {saving ? 'Saving…' : `Save ${chosen.length} memor${chosen.length === 1 ? 'y' : 'ies'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

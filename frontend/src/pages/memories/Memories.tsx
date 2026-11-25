import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/api';
import type { Memory, Privacy, Trip } from '../../api/types';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { formatEthiopianAm, formatEthiopianShortAm } from '../../lib/ethiopianDate';
import { regionName } from '../../lib/regions';
import { useAsync } from '../../lib/useAsync';
import { MemoryForm } from './MemoryForm';
import { PhotoImport } from './PhotoImport';
import { ShareTrip } from './ShareTrip';
import { PendingUploads } from '../../offline/OfflineUi';
import { onSynced } from '../../offline/outbox';
import { PRIVACY_LABEL, PRIVACY_ORDER } from './privacy';

const DAY_COLORS = ['var(--flag-green)', 'var(--flag-yellow)', 'var(--flag-red)'];

export function Memories() {
  const [params, setParams] = useSearchParams();
  const [tripFilter, setTripFilter] = useState<string>(params.get('trip') ?? '');
  const [sharing, setSharing] = useState(false);
  const [authors, setAuthors] = useState<Map<string, { name: string; mine: boolean }>>(new Map());
  const [showForm, setShowForm] = useState(params.get('new') === '1');
  const [editing, setEditing] = useState<Memory | null>(null);
  const [importing, setImporting] = useState(false);

  const tripsQ = useAsync(() => api.listTrips(), []);
  // A trip shows everything you can see in it (shared trips include other members' memories).
  const memQ = useAsync(async () => {
    if (!tripFilter) { setAuthors(new Map()); return api.listMemories({ size: 100 }); }
    const feed = await api.tripFeed(tripFilter);
    setAuthors(new Map(feed.items.map((i) => [i.memory.id, { name: i.authorName, mine: i.mine }])));
    return { items: feed.items.map((i) => i.memory), page: 0, size: feed.items.length, total: feed.total };
  }, [tripFilter]);
  const isMine = (m: Memory) => authors.get(m.id)?.mine ?? true;

  // Refresh when memories saved offline reach the server.
  useEffect(() => onSynced(() => { void memQ.reload(); void tripsQ.reload(); }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const trips = tripsQ.data ?? [];
  const memories = memQ.data?.items ?? [];
  const selectedId = params.get('id') ?? memories[0]?.id;
  const selected = memories.find((m) => m.id === selectedId) ?? memories[0];
  const trip = trips.find((t) => t.id === tripFilter);
  const writableTrips = trips.filter((t) => t.role !== 'VIEWER');
  const canAdd = !trip || trip.role !== 'VIEWER';
  const groups = useMemo(() => groupByDay(memories, trip), [memories, trip]);

  function select(id: string) {
    setParams((p) => { p.set('id', id); p.delete('new'); return p; }, { replace: true });
  }

  function onSaved(m: Memory) {
    setShowForm(false);
    setEditing(null);
    void memQ.reload().then(() => select(m.id));
    void tripsQ.reload();
  }

  async function changePrivacy(m: Memory, privacy: Privacy) {
    const updated = await api.setPrivacy(m.id, privacy);
    memQ.setData((d) => d && { ...d, items: d.items.map((x) => (x.id === m.id ? updated : x)) });
  }

  async function remove(m: Memory) {
    if (!window.confirm(`Delete "${m.title}" and all its photos? This cannot be undone.`)) return;
    await api.deleteMemory(m.id);
    setParams((p) => { p.delete('id'); return p; }, { replace: true });
    void memQ.reload();
    void tripsQ.reload();
  }

  async function addFiles(m: Memory, files: FileList | null) {
    if (!files?.length) return;
    for (const f of Array.from(files)) await api.uploadMedia(m.id, f);
    void memQ.reload();
  }

  return (
    <>
      <PageHeader
        title="Memory vault"
        am="የትዝታ ማህደር"
        eyebrow={trip ? `Trip · ${trip.name}${trip.startDate ? ` · ${trip.startDate} – ${trip.endDate ?? ''}` : ''}${trip.role !== 'OWNER' ? ` · shared by ${trip.ownerName ?? 'a traveler'}` : ''}` : 'All your memories'}
        actions={
          <>
            <Link to="/books" className="btn"><Icon name="book" size={18} />Make a book</Link>
            {trip ? (
              <button type="button" className="btn" onClick={() => setSharing(true)}>
                <Icon name={trip.role === 'OWNER' ? 'share' : 'users'} size={18} />{trip.role === 'OWNER' ? (trip.memberCount ? `Shared · ${trip.memberCount + 1} people` : 'Share trip') : 'Members'}
              </button>
            ) : null}
            {canAdd ? <button type="button" className="btn" onClick={() => setImporting(true)}><Icon name="photo" size={18} />Import photos</button> : null}
            {canAdd ? <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}><Icon name="plus" size={18} stroke={2.6} />New memory</button> : null}
          </>
        }
      />

      <div className="pills" role="group" aria-label="Filter trips">
        <button type="button" className="pill dark" aria-pressed={tripFilter === ''} onClick={() => setTripFilter('')}>All memories</button>
        {trips.map((t) => (
          <button key={t.id} type="button" className="pill dark" aria-pressed={tripFilter === t.id} onClick={() => setTripFilter(t.id)}>
            {t.role !== 'OWNER' || t.memberCount ? <span style={{ marginRight: 4, display: 'inline-flex' }}><Icon name="users" size={14} /></span> : null}
            {t.name} <span className="muted" style={{ color: 'inherit', opacity: 0.7 }}>· {t.memoryCount}</span>
          </button>
        ))}
        <NewTripButton onCreated={(t) => { void tripsQ.reload(); setTripFilter(t.id); }} />
      </div>

      <PendingUploads />

      {memQ.error ? <div className="banner error">{memQ.error}</div> : null}

      {memQ.loading && !memories.length ? <p className="muted">Loading memories…</p> : null}

      {!memQ.loading && !memories.length ? (
        <div className="card empty">
          <p style={{ fontSize: 17, margin: '0 0 12px', color: 'var(--ink)' }}>No memories here yet.</p>
          <div className="pills" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn btn-primary" onClick={() => setImporting(true)}><Icon name="photo" size={18} />Import photos from a trip</button>
            <button type="button" className="btn" onClick={() => setShowForm(true)}>Write a memory</button>
          </div>
        </div>
      ) : null}

      {memories.length ? (
        <div className="row">
          <section aria-label="Timeline" className="col-side stack" style={{ gap: 16 }}>
            {groups.map((g, gi) => (
              <div key={g.key} className="stack" style={{ gap: 10 }}>
                <h2 className="day-head eyebrow">
                  <span className="day-num" style={{ background: DAY_COLORS[gi % 3], color: gi % 3 === 1 ? 'var(--green-900)' : '#fff', letterSpacing: 0 }}>{g.badge}</span>
                  {g.label} <span className="am" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{g.labelAm}</span>
                </h2>
                {g.items.map((m) => {
                  const photo = m.media.find((x) => x.kind === 'PHOTO');
                  return (
                    <button key={m.id} type="button" className="timeline-item" aria-current={m.id === selected?.id} onClick={() => select(m.id)}>
                      <span className="thumb" style={photo ? { backgroundImage: `url(${photo.url})` } : undefined} />
                      <span className="stack" style={{ gap: 4, minWidth: 0 }}>
                        <span style={{ fontWeight: 600 }}>{m.title}</span>
                        <span className="muted small">{m.media.length} files · {PRIVACY_LABEL[m.privacy].en}{m.placeName ? ` · ${m.placeName}` : ''}</span>
                        {!isMine(m) ? <span className="author-chip"><span className="avatar" aria-hidden="true">{authors.get(m.id)!.name.charAt(0)}</span>{authors.get(m.id)!.name}</span> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </section>

          {selected ? (
            <MemoryDetail memory={selected} onPrivacy={(p) => changePrivacy(selected, p)} onEdit={() => setEditing(selected)}
              onDelete={() => remove(selected)} onAddFiles={(f) => addFiles(selected, f)}
              author={isMine(selected) ? undefined : authors.get(selected.id)?.name} />
          ) : null}
        </div>
      ) : null}

      {sharing && trip ? (
        <ShareTrip trip={trip} onClose={() => { setSharing(false); void tripsQ.reload(); }}
          onLeft={() => { setSharing(false); setTripFilter(''); void tripsQ.reload(); }} />
      ) : null}
      {importing ? (
        <PhotoImport trips={writableTrips} onClose={() => setImporting(false)}
          onDone={(tid) => { setImporting(false); void tripsQ.reload(); if (tid) setTripFilter(tid); void memQ.reload(); }}
          onQueued={() => setImporting(false)} />
      ) : null}
      {showForm || editing ? (
        <MemoryForm trips={writableTrips} defaultTripId={canAdd ? tripFilter || undefined : undefined} existing={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null); setParams((p) => { p.delete('new'); return p; }, { replace: true }); }}
          onSaved={onSaved}
          onQueued={() => { setShowForm(false); setEditing(null); setParams((p) => { p.delete('new'); return p; }, { replace: true }); }} />
      ) : null}
    </>
  );
}

function MemoryDetail({ memory: m, onPrivacy, onEdit, onDelete, onAddFiles, author }: {
  memory: Memory;
  /** Set when another trip member added this memory: then it is read-only for you. */
  author?: string;
  onPrivacy: (p: Privacy) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddFiles: (files: FileList | null) => void;
}) {
  const photos = m.media.filter((x) => x.kind === 'PHOTO');
  const videos = m.media.filter((x) => x.kind === 'VIDEO');
  const audios = m.media.filter((x) => x.kind === 'AUDIO');
  const region = regionName(m.regionCode);
  const date = new Date(m.happenedAt);
  const [main, ...rest] = photos;

  return (
    <article aria-labelledby="mtitle" className="card card-lg col-main" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ height: 300, background: main ? `#c4a27a url(${main.url}) center / cover no-repeat` : '#c4a27a', position: 'relative', display: 'grid', placeItems: 'center' }}>
        {!main ? <span style={{ color: '#3f2e1c', fontWeight: 600 }}>No photo yet</span> : null}
        {rest.length ? (
          <div style={{ position: 'absolute', bottom: 14, left: 14, display: 'flex', gap: 8 }}>
            {rest.slice(0, 3).map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer" style={{ width: 52, height: 52, borderRadius: 8, border: '2px solid #fff', background: `url(${p.url}) center / cover` }} aria-label="Open photo" />
            ))}
            {rest.length > 3 ? <span className="photo-chip" style={{ alignSelf: 'center' }}>+{rest.length - 3}</span> : null}
          </div>
        ) : null}
      </div>
      <div className="tibeb" />
      <div className="stack" style={{ padding: '24px 26px', gap: 18 }}>
        <div className="stack" style={{ gap: 6 }}>
          <h2 id="mtitle" className="section-title" style={{ fontSize: 26 }}>{m.title}</h2>
          <span className="muted" style={{ fontSize: 14 }}>
            {m.placeName ?? 'Unknown place'}{region ? <> · {region.en} <span className="am">{region.am}</span></> : null} ·{' '}
            <span className="am">{formatEthiopianAm(date)}</span> / {date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            {m.latitude != null && m.longitude != null ? ` · ${m.latitude.toFixed(4)}, ${m.longitude.toFixed(4)}` : ''}
          </span>
        </div>
        {m.story ? <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: 'var(--ink-2)', whiteSpace: 'pre-line' }}>{m.story}</p> : null}

        {audios.map((a) => <audio key={a.id} controls src={a.url} style={{ width: '100%' }} />)}
        {videos.map((v) => <video key={v.id} controls src={v.url} style={{ width: '100%', borderRadius: 12 }} />)}

        {author ? (
          <div className="banner info" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Icon name="users" size={16} />Added by <strong>{author}</strong> · {PRIVACY_LABEL[m.privacy].en}. Only {author.split(' ')[0]} can change it.
          </div>
        ) : (
          <>
        <div className="stack" style={{ gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Who can see this? <span className="am muted" style={{ fontWeight: 500 }}>· ማን ያያል?</span></span>
          <div className="pills" role="radiogroup" aria-label="Privacy">
            {PRIVACY_ORDER.map((p) => (
              <button key={p} type="button" role="radio" className="pill" aria-checked={m.privacy === p} onClick={() => onPrivacy(p)}>
                {PRIVACY_LABEL[p].en} · <span className="am">{PRIVACY_LABEL[p].am}</span>
              </button>
            ))}
          </div>
          <span className="muted small">{PRIVACY_LABEL[m.privacy].hint}</span>
        </div>

        <div className="pills" style={{ borderTop: '1px solid var(--line)', paddingTop: 18 }}>
          <label className="btn" style={{ cursor: 'pointer' }}>
            <Icon name="upload" size={18} />Add photos
            <input type="file" multiple accept="image/*,video/*,audio/*" className="sr-only" onChange={(e) => onAddFiles(e.target.files)} />
          </label>
          <button type="button" className="btn" onClick={onEdit}>Edit</button>
          <Link to="/books" className="btn" style={{ background: 'var(--yellow-50)', borderColor: 'var(--yellow-50)', color: '#6b4e0a' }}>Add to a book</Link>
          <button type="button" className="btn" onClick={onDelete} style={{ marginLeft: 'auto', color: '#8a0c12' }}><Icon name="trash" size={18} />Delete</button>
        </div>
          </>
        )}
      </div>
    </article>
  );
}

function NewTripButton({ onCreated }: { onCreated: (t: Trip) => void }) {
  async function create() {
    const name = window.prompt('Name your trip (e.g. "Bale & Sof Omar")');
    if (!name?.trim()) return;
    onCreated(await api.createTrip({ name: name.trim() }));
  }
  return <button type="button" className="pill" onClick={create} style={{ borderStyle: 'dashed', color: 'var(--green-600)' }}>+ New trip</button>;
}

interface DayGroup { key: string; badge: string; label: string; labelAm: string; items: Memory[] }

function groupByDay(memories: Memory[], trip?: Trip): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  const start = trip?.startDate ? new Date(`${trip.startDate}T00:00:00`) : null;
  for (const m of memories) {
    const d = new Date(m.happenedAt);
    const key = d.toDateString();
    if (!groups.has(key)) {
      const dayIndex = start ? Math.floor((new Date(d.toDateString()).getTime() - start.getTime()) / 86400000) + 1 : null;
      groups.set(key, {
        key,
        badge: dayIndex && dayIndex > 0 ? String(dayIndex) : String(d.getDate()),
        label: dayIndex && dayIndex > 0 ? `Day ${dayIndex}${m.placeName ? ` · ${m.placeName}` : ''}` : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        labelAm: formatEthiopianShortAm(d),
        items: [],
      });
    }
    groups.get(key)!.items.push(m);
  }
  return [...groups.values()];
}

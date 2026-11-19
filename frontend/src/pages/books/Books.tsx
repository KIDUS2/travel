import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/api';
import type { Book, BookPage, BookSettings, BookSummary, BookType } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { formatEthiopianAm } from '../../lib/ethiopianDate';
import { useAsync } from '../../lib/useAsync';
import { Book3D } from './Book3D';
import { BookPreview } from './BookPreview';
import { BOOK_TYPES, DEFAULT_SETTINGS, PAGE_RATIO, SIZE_LABEL, autoGenerate, mapPageText } from './layouts';
import { buildPageContext } from './pageContext';
import type { PageContext } from './PageView';
import './books.css';

const FINISH: Record<BookSettings['finish'], string> = { hard: 'Hardcover', soft: 'Softcover', lay: 'Layflat' };
const COVER_STYLES: { id: BookSettings['cover']; label: string; am: string }[] = [
  { id: 'tibeb', label: 'Highland green', am: 'አረንጓዴ' },
  { id: 'minimal', label: 'Minimal cream', am: 'ቀላል' },
  { id: 'photo', label: 'Photo', am: 'ፎቶ' },
];

export function Books() {
  const navigate = useNavigate();
  const { name } = useAuth();
  const booksQ = useAsync(() => api.listBooks(), []);
  const tripsQ = useAsync(() => api.listTrips(), []);
  const [type, setType] = useState<BookType>('classic');
  const [tripId, setTripId] = useState('');
  const [cover, setCover] = useState<BookSettings['cover']>('tibeb');
  const [includeMap, setIncludeMap] = useState(true);
  const [busy, setBusy] = useState<'auto' | 'blank' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [preview, setPreview] = useState<{ book: Book; ctx: PageContext } | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const createRef = useRef<HTMLElement>(null);

  const tripMemQ = useAsync(() => api.listMemories({ tripId: tripId || undefined, size: 100 }), [tripId]);
  const trips = tripsQ.data ?? [];
  const books = booksQ.data ?? [];
  const chosen = BOOK_TYPES.find((t) => t.id === type)!;
  const trip = trips.find((t) => t.id === tripId);
  const tripMemories = tripMemQ.data?.items ?? [];
  const settings: BookSettings = { ...DEFAULT_SETTINGS, size: chosen.size, cover, includeMap };
  const title = trip?.name ?? 'My Ethiopia';

  // Live cover for the summary: same rules the real book uses.
  const firstPhoto = [...tripMemories].sort((a, b) => a.happenedAt.localeCompare(b.happenedAt))
    .flatMap((m) => m.media).find((x) => x.kind === 'PHOTO');
  const previewCover: BookPage = useMemo(() => ({
    id: 'preview', layout: 'cover', background: cover === 'minimal' ? 'cream' : cover === 'tibeb' ? 'green' : 'white',
    slots: { ...(firstPhoto ? { p1: firstPhoto.id } : {}), kicker: 'የጉዞ ትዝታዬ', title, subtitle: `${name} · ${formatEthiopianAm(new Date())}` },
  }), [cover, firstPhoto, title, name]);
  const photoCount = tripMemories.reduce((n, m) => n + m.media.filter((x) => x.kind === 'PHOTO').length, 0);
  const estPages = 3 + tripMemories.reduce((n, m) => n + 1 + Math.ceil(Math.max(0, m.media.filter((x) => x.kind === 'PHOTO').length - 1) / 2), 0) + (includeMap ? 1 : 0);

  async function create(autoFill: boolean) {
    setBusy(autoFill ? 'auto' : 'blank');
    setError(null);
    try {
      const pages = autoGenerate({ title, travelerName: name, trip, memories: autoFill ? tripMemories : [], settings })
        // The map page always reflects the trip, even in a blank book.
        .map((p) => (p.layout === 'map' ? { ...p, slots: mapPageText(tripMemories) } : p));
      const book = await api.createBook({ title, tripId: tripId || null, bookType: type, settings, pages });
      navigate(`/books/${book.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the book');
      setBusy(null);
    }
  }

  async function openPreview(b: BookSummary) {
    setOpening(b.id);
    try {
      const [book, photos, mems] = await Promise.all([api.getBook(b.id), api.listBookPhotos(b.id), api.listMemories({ size: 100 })]);
      setPreview({ book, ctx: buildPageContext(mems.items, photos, book.tripId) });
    } finally {
      setOpening(null);
    }
  }

  async function remove(b: BookSummary) {
    if (!window.confirm(`Delete "${b.title}" and all its pages? This cannot be undone.`)) return;
    await api.deleteBook(b.id);
    void booksQ.reload();
  }

  const scrollToCreate = () => createRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      <PageHeader title="Book studio" am="የትዝታ መጽሐፍ"
        subtitle="Turn a trip into a printed photo book. Teguwaz lays out a first draft from your memories, then you make every page yours."
        actions={books.length ? <button type="button" className="btn btn-primary" onClick={scrollToCreate}><Icon name="plus" size={18} stroke={2.6} />New book</button> : undefined} />

      <section className="shelf" aria-labelledby="mine">
        <div className="shelf-head">
          <h2 id="mine" className="section-title">My books <span className="am">· የእኔ መጽሐፍት</span></h2>
          {books.length ? <span className="muted small">{books.length} book{books.length === 1 ? '' : 's'}</span> : null}
        </div>

        {booksQ.loading && !books.length ? <p className="muted" style={{ padding: '20px 24px' }}>Loading your books…</p> : null}

        {!booksQ.loading && !books.length ? (
          <div className="empty-shelf">
            <Book3D page={null} settings={DEFAULT_SETTINGS} height={150} title="Your first book" pageCount={30} />
            <div className="stack" style={{ maxWidth: 420 }}>
              <strong style={{ fontSize: 18 }}>Your shelf is empty</strong>
              <span className="muted">Pick a trip below and Teguwaz will lay out your first book in seconds: cover, a page for every memory, your map, and space for your own words.</span>
              <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={scrollToCreate}>Make my first book</button>
            </div>
          </div>
        ) : null}

        {books.length ? (
          <>
            <div className="shelf-row">
              {books.map((b) => (
                <article key={b.id} className="book-tile" aria-label={b.title}>
                  <Link to={`/books/${b.id}`} className="book-tile-link" aria-label={`Edit ${b.title}`}>
                    <Book3D page={b.coverPage} settings={b.settings} height={coverHeight(b.settings)} pageCount={b.pageCount}
                      photoUrl={b.coverPhotoUrl} title={b.title} />
                  </Link>
                  <div className="book-tile-info">
                    <strong title={b.title}>{b.title}</strong>
                    <span className="muted small">{Math.max(0, b.pageCount - 1)} pages · {SIZE_LABEL[b.settings.size]} · {FINISH[b.settings.finish]}</span>
                    <span className="muted small">
                      {b.status === 'ORDERED' ? <span className="tag green">Ordered</span> : <span className="tag">Draft</span>}
                      {' '}Edited {new Date(b.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="book-tile-actions">
                    <Link to={`/books/${b.id}`} className="btn btn-primary"><Icon name="book" size={16} />Edit</Link>
                    <button type="button" className="btn" onClick={() => openPreview(b)} disabled={opening === b.id}>
                      <Icon name="eye" size={16} />{opening === b.id ? 'Opening…' : 'Preview'}
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Delete ${b.title}`} title="Delete" onClick={() => remove(b)}><Icon name="trash" size={17} /></button>
                  </div>
                </article>
              ))}
              <button type="button" className="new-book-tile" onClick={scrollToCreate}>
                <Icon name="plus" size={28} />New book<span className="am small" style={{ fontWeight: 500 }}>አዲስ መጽሐፍ</span>
              </button>
            </div>
            <div className="shelf-board" aria-hidden="true" />
          </>
        ) : null}
      </section>

      <section ref={createRef} aria-labelledby="new" className="card card-lg" style={{ overflow: 'hidden', padding: 0, scrollMarginTop: 16 }}>
        <div className="tibeb" />
        <div style={{ padding: '24px 24px 28px' }}>
          <h2 id="new" className="section-title" style={{ fontSize: 24, marginBottom: 22 }}>Make a new book <span className="am">· አዲስ መጽሐፍ</span></h2>

          <div className="create-grid">
            <div className="create-steps">
              <div className="step">
                <span className="step-num">1</span>
                <div className="step-body">
                  <h3 className="step-title">Choose a book type</h3>
                  <div role="radiogroup" aria-label="Book type" className="type-grid">
                    {BOOK_TYPES.map((t) => {
                      const h = 62;
                      const w = Math.round(h * PAGE_RATIO[t.size] * (t.id === 'mini' ? 0.9 : 1));
                      return (
                        <button key={t.id} type="button" role="radio" aria-checked={type === t.id} className="type-card" onClick={() => setType(t.id)}>
                          {type === t.id ? <span className="type-check" aria-hidden="true">✓</span> : null}
                          <span className="type-shape-wrap">
                            {t.id === 'custom' ? (
                              <span style={{ width: 70, height: h, borderRadius: 6, border: '2px dashed #A89C80', display: 'grid', placeItems: 'center', color: '#8A7D63' }}><Icon name="star" size={22} /></span>
                            ) : (
                              <span className="type-shape" style={{ width: w, height: t.id === 'mini' ? w : h, background: t.thumb }}>
                                {t.band ? <span className="band" /> : null}
                              </span>
                            )}
                          </span>
                          <span className="stack" style={{ gap: 2 }}>
                            <strong style={{ fontSize: 15 }}>{t.name}</strong>
                            <span className="am small" style={{ color: 'var(--green-600)' }}>{t.am}</span>
                            <span className="muted small" style={{ lineHeight: 1.4 }}>{t.spec}</span>
                          </span>
                          {t.popular ? <span className="tag solid-yellow" style={{ fontSize: 11 }}>MOST POPULAR</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {type === 'custom' ? (
                <div className="step">
                  <span className="step-num yellow">2</span>
                  <div className="step-body">
                    <h3 className="step-title">Tell us about your book</h3>
                    {requestSent ? (
                      <div className="banner info">Thanks! Your request is noted. Custom designs are handled by the team once ordering opens.</div>
                    ) : (
                      <form className="stack" style={{ gap: 14, maxWidth: 640 }} onSubmit={(e) => { e.preventDefault(); setRequestSent(true); }}>
                        <p className="muted" style={{ margin: 0 }}>Our team designs it from your memories and sends a preview and price before anything is printed.</p>
                        <label className="field">Which trip?
                          <select className="select" value={tripId} onChange={(e) => setTripId(e.target.value)}>
                            <option value="">All my memories</option>
                            {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </label>
                        <label className="field">Describe your book
                          <textarea className="textarea" required placeholder="e.g. An anniversary book of our trip to Lalibela and Bahir Dar, Amharic captions, big photos, a map of where we went…" />
                        </label>
                        <label className="field">Needed by<input className="input" type="date" /></label>
                        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Send request</button>
                      </form>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="step">
                    <span className="step-num">2</span>
                    <div className="step-body">
                      <h3 className="step-title">Which trip goes in the book?</h3>
                      <label className="field" style={{ maxWidth: 520 }}>
                        <span className="sr-only">Trip</span>
                        <select className="select" value={tripId} onChange={(e) => setTripId(e.target.value)}>
                          <option value="">All my memories</option>
                          {trips.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.memoryCount} memories)</option>)}
                        </select>
                      </label>
                      <span className="muted small">{tripMemQ.loading ? 'Counting…' : `${tripMemories.length} ${tripMemories.length === 1 ? "memory" : "memories"} · ${photoCount} ${photoCount === 1 ? "photo" : "photos"} to lay out`}</span>
                    </div>
                  </div>

                  <div className="step">
                    <span className="step-num">3</span>
                    <div className="step-body">
                      <h3 className="step-title">Pick a cover style</h3>
                      <div role="radiogroup" aria-label="Cover style" className="cover-options">
                        {COVER_STYLES.map((c) => (
                          <button key={c.id} type="button" role="radio" aria-checked={cover === c.id} className="cover-option" onClick={() => setCover(c.id)}>
                            <span className="cover-swatch" style={{
                              background: c.id === 'tibeb' ? '#0B3D23' : c.id === 'minimal' ? '#F8F1E1' : '#C4A27A',
                              border: c.id === 'minimal' ? '1px solid var(--line-2)' : undefined,
                            }}>
                              {c.id === 'tibeb' ? <span className="tibeb" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8 }} /> : null}
                              {c.id === 'photo' ? <span style={{ position: 'absolute', left: 6, right: 6, bottom: 6, height: 6, background: 'rgba(255,255,255,0.85)', borderRadius: 2 }} /> : null}
                            </span>
                            {c.label}
                            <span className="am muted" style={{ fontWeight: 500, fontSize: 12 }}>{c.am}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="step">
                    <span className="step-num">4</span>
                    <div className="step-body">
                      <h3 className="step-title">Extras</h3>
                      <label className="check highlight" style={{ maxWidth: 520 }}>
                        <input type="checkbox" checked={includeMap} onChange={(e) => setIncludeMap(e.target.checked)} />
                        <span>Add a <strong>coverage map page</strong> showing where you went</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>

            {type !== 'custom' ? (
              <aside className="create-aside" aria-label="Your new book">
                <div className="summary-card">
                  <div className="summary-stage">
                    <Book3D page={previewCover} settings={settings} height={chosen.size === 'a4-landscape' ? 150 : 190} pageCount={estPages}
                      photoUrl={firstPhoto?.url} />
                  </div>
                  <div className="tibeb" />
                  <div className="summary-body">
                    <span className="small" style={{ color: 'var(--on-dark-muted)' }}>Your new book</span>
                    <strong style={{ fontFamily: 'var(--font-head)', fontSize: 20 }}>{title}</strong>
                    <dl className="summary-specs">
                      <dt>Type</dt><dd>{chosen.name}</dd>
                      <dt>Size</dt><dd>{SIZE_LABEL[chosen.size]}</dd>
                      <dt>Pages</dt><dd>about {estPages} with auto-fill</dd>
                      <dt>Cover</dt><dd>{COVER_STYLES.find((c) => c.id === cover)?.label}</dd>
                      <dt>Map page</dt><dd>{includeMap ? 'Yes' : 'No'}</dd>
                    </dl>
                    {error ? <div className="banner error">{error}</div> : null}
                    <button type="button" className="btn btn-yellow" disabled={busy !== null} onClick={() => create(true)}>
                      <Icon name="star" size={18} />{busy === 'auto' ? 'Laying out your book…' : 'Create & auto-fill'}
                    </button>
                    <button type="button" className="btn btn-ghost-dark" disabled={busy !== null} onClick={() => create(false)}>
                      {busy === 'blank' ? 'Creating…' : 'Start with blank pages'}
                    </button>
                    <span className="small" style={{ color: 'var(--on-dark-muted)', textAlign: 'center' }}>Everything can be changed in the editor.</span>
                  </div>
                </div>
              </aside>
            ) : null}
          </div>
        </div>
      </section>

      {preview ? <BookPreview book={preview.book} ctx={preview.ctx} onClose={() => setPreview(null)} /> : null}
    </>
  );
}

/** Same visual weight for every shape: landscape books are shorter, portrait taller. */
function coverHeight(s: BookSettings) {
  return s.size === 'a4-landscape' ? 160 : s.size === 'square' ? 190 : 220;
}

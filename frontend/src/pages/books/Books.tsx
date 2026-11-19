import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/api';
import type { BookSettings, BookSummary, BookType } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { useAsync } from '../../lib/useAsync';
import { BOOK_TYPES, DEFAULT_SETTINGS, SIZE_LABEL, autoGenerate } from './layouts';

export function Books() {
  const navigate = useNavigate();
  const { name } = useAuth();
  const booksQ = useAsync(() => api.listBooks(), []);
  const tripsQ = useAsync(() => api.listTrips(), []);
  const [type, setType] = useState<BookType>('classic');
  const [tripId, setTripId] = useState('');
  const [cover, setCover] = useState<BookSettings['cover']>('tibeb');
  const [includeMap, setIncludeMap] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const trips = tripsQ.data ?? [];
  const books = booksQ.data ?? [];
  const chosen = BOOK_TYPES.find((t) => t.id === type)!;

  async function create(autoFill: boolean) {
    setBusy(true);
    setError(null);
    try {
      const trip = trips.find((t) => t.id === tripId);
      const settings: BookSettings = { ...DEFAULT_SETTINGS, size: chosen.size, cover, includeMap };
      const title = trip?.name ?? 'My Ethiopia';
      const memories = autoFill ? (await api.listMemories({ tripId: tripId || undefined, size: 100 })).items : [];
      const pages = autoGenerate({ title, travelerName: name, trip, memories, settings });
      const book = await api.createBook({ title, tripId: tripId || null, bookType: type, settings, pages });
      navigate(`/books/${book.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the book');
      setBusy(false);
    }
  }

  async function remove(b: BookSummary) {
    if (!window.confirm(`Delete "${b.title}"? This cannot be undone.`)) return;
    await api.deleteBook(b.id);
    void booksQ.reload();
  }

  return (
    <>
      <PageHeader title="Book studio" am="የትዝታ መጽሐፍ"
        subtitle="Turn a trip into a printed photo book. Teguwaz lays out a first draft from your memories; then you edit every page." />

      {books.length ? (
        <section aria-labelledby="mine" className="stack" style={{ gap: 12 }}>
          <h2 id="mine" className="section-title">My books <span className="am">· የእኔ መጽሐፍት</span></h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {books.map((b) => (
              <div key={b.id} className="card" style={{ width: 230, overflow: 'hidden' }}>
                <Link to={`/books/${b.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ height: 150, background: 'var(--green-900)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{ padding: '0 16px 12px', color: '#fff', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18 }}>{b.title}</div>
                    <div className="tibeb" />
                  </div>
                  <div className="stack" style={{ padding: 14, gap: 4 }}>
                    <strong>{b.title}</strong>
                    <span className="muted small">{b.pageCount} pages · {SIZE_LABEL[b.settings.size] ?? ''}</span>
                    <span className="muted small">Edited {new Date(b.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </Link>
                <div className="pills" style={{ padding: '0 14px 14px' }}>
                  <Link to={`/books/${b.id}`} className="btn btn-primary" style={{ minHeight: 40, flex: 1 }}>Edit</Link>
                  <button type="button" className="icon-btn" style={{ width: 40, height: 40 }} aria-label={`Delete ${b.title}`} onClick={() => remove(b)}><Icon name="trash" size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="new" className="card card-lg" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="tibeb" />
        <div className="stack" style={{ padding: 24, gap: 20 }}>
          <h2 id="new" className="section-title">Make a new book <span className="am">· አዲስ መጽሐፍ</span></h2>

          <div className="stack" style={{ gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>1. Choose a book type</span>
            <div role="radiogroup" aria-label="Book type" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {BOOK_TYPES.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={type === t.id} onClick={() => setType(t.id)}
                  style={{
                    flex: '1 1 170px', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                    background: type === t.id ? 'var(--green-50)' : '#fff', border: `2px solid ${type === t.id ? 'var(--green-600)' : 'var(--line)'}`,
                  }}>
                  <span style={{ height: 70, borderRadius: 8, background: t.thumb, display: 'flex', alignItems: 'flex-end', overflow: 'hidden', border: t.id === 'custom' ? '2px dashed #A89C80' : undefined }}>
                    {t.band ? <span style={{ width: '100%', height: 8, background: 'repeating-linear-gradient(90deg,#078930 0 8px,#FCDD09 8px 16px,#DA121A 16px 24px)' }} /> : null}
                  </span>
                  <span className="stack" style={{ gap: 2 }}>
                    <strong>{t.name}</strong>
                    <span className="am small" style={{ color: 'var(--green-600)' }}>{t.am}</span>
                    <span className="muted small">{t.spec}</span>
                  </span>
                  {t.popular ? <span className="tag solid-yellow" style={{ alignSelf: 'flex-start', fontSize: 11 }}>MOST POPULAR</span> : null}
                </button>
              ))}
            </div>
          </div>

          {type === 'custom' ? (
            requestSent ? (
              <div className="banner info">Thanks! Your request is noted. Custom design requests are handled by the team once ordering opens.</div>
            ) : (
              <form className="stack" style={{ gap: 14, maxWidth: 640 }} onSubmit={(e) => { e.preventDefault(); setRequestSent(true); }}>
                <p className="muted" style={{ margin: 0 }}>Tell us the book you imagine. Our team designs it from your memories and sends a preview and price before anything is printed.</p>
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
            )
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                <label className="field" style={{ flex: '1 1 260px' }}>2. Which trip goes in the book?
                  <select className="select" value={tripId} onChange={(e) => setTripId(e.target.value)}>
                    <option value="">All my memories</option>
                    {trips.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.memoryCount} memories)</option>)}
                  </select>
                </label>
                <div className="field" style={{ flex: '1 1 260px' }}>3. Cover style
                  <div className="pills" role="radiogroup" aria-label="Cover style">
                    {([['tibeb', 'Highland green'], ['minimal', 'Minimal cream'], ['photo', 'Photo']] as const).map(([v, l]) => (
                      <button key={v} type="button" role="radio" className="pill" aria-checked={cover === v} onClick={() => setCover(v)}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
              <label className="check highlight" style={{ maxWidth: 520 }}>
                <input type="checkbox" checked={includeMap} onChange={(e) => setIncludeMap(e.target.checked)} />
                <span>Add a <strong>coverage map page</strong> showing where you went</span>
              </label>
              {error ? <div className="banner error">{error}</div> : null}
              <div className="pills">
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => create(true)}>
                  <Icon name="star" size={18} />{busy ? 'Creating…' : 'Create & auto-fill from my memories'}
                </button>
                <button type="button" className="btn" disabled={busy} onClick={() => create(false)}>Start with blank pages</button>
              </div>
              <p className="muted small" style={{ margin: 0 }}>
                {chosen.name}: {SIZE_LABEL[chosen.size]}. You can change size, layouts, photos and every word in the editor.
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}

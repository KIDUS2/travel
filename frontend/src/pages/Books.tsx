import { useState } from 'react';
import { api } from '../api/api';
import { EthiopiaMap, pinsFromMemories } from '../components/EthiopiaMap';
import { PageHeader } from '../components/PageHeader';
import { computeCoverage } from '../lib/coverage';
import { formatEthiopianAm } from '../lib/ethiopianDate';
import { useAsync } from '../lib/useAsync';
import { FlagProgress } from './Home';

type BookType = 'classic' | 'journal' | 'atlas' | 'mini' | 'custom';
type Cover = 'tibeb' | 'minimal' | 'photo';
type Finish = 'hard' | 'soft' | 'lay';
type BookLang = 'en' | 'am' | 'both';
type Tab = 'cover' | 'map' | 'page';

const TYPES: { id: BookType; name: string; am: string; spec: string; size: string; pages: string; thumb: string; band: boolean; popular?: boolean }[] = [
  { id: 'classic', name: 'Classic photo book', am: 'የፎቶ መጽሐፍ', spec: 'A4 landscape · Hardcover · 40 pages', size: 'A4 landscape', pages: '40 pages', thumb: '#C4A27A', band: true, popular: true },
  { id: 'journal', name: 'Travel journal', am: 'የጉዞ ማስታወሻ', spec: 'A5 portrait · Softcover · stories + photos', size: 'A5 portrait', pages: '64 pages', thumb: '#7E9A72', band: false },
  { id: 'atlas', name: 'Coverage atlas', am: 'የጉዞ አትላስ', spec: 'A4 · Hardcover · maps + a chapter per region', size: 'A4 portrait', pages: '48 pages', thumb: '#0B3D23', band: true },
  { id: 'mini', name: 'Pocket mini', am: 'የኪስ መጽሐፍ', spec: '15 × 15 cm · Softcover · 24 pages', size: '15 × 15 cm', pages: '24 pages', thumb: '#D9B23F', band: false },
  { id: 'custom', name: 'Custom request', am: 'የራስዎ ምርጫ', spec: 'Describe it, we design it and send a preview', size: '', pages: '', thumb: '#F0ECE0', band: false },
];

const FINISH_LABEL: Record<Finish, string> = { hard: 'Hardcover', soft: 'Softcover', lay: 'Layflat' };
const LANG_LABEL: Record<BookLang, string> = { en: 'English', am: 'አማርኛ', both: 'Both' };

export function Books() {
  const [type, setType] = useState<BookType>('classic');
  const [cover, setCover] = useState<Cover>('tibeb');
  const [finish, setFinish] = useState<Finish>('hard');
  const [lang, setLang] = useState<BookLang>('both');
  const [tab, setTab] = useState<Tab>('cover');
  const [includeMap, setIncludeMap] = useState(true);
  const [tripId, setTripId] = useState('');

  const tripsQ = useAsync(() => api.listTrips(), []);
  const memQ = useAsync(() => api.listMemories({ tripId: tripId || undefined, size: 100 }), [tripId]);
  const trips = tripsQ.data ?? [];
  const memories = memQ.data?.items ?? [];
  const trip = trips.find((t) => t.id === tripId);
  const current = TYPES.find((t) => t.id === type)!;
  const isCustom = type === 'custom';
  const cov = computeCoverage(memories);
  const firstMemory = memories[0];
  const bookTitle = trip?.name ?? 'My Ethiopia';

  return (
    <>
      <PageHeader title="Book studio" am="የትዝታ መጽሐፍ"
        subtitle="Turn your memories into a printed book. Pick a ready-made type, customize it, or ask us to design one for you." />

      <section aria-labelledby="types" className="stack">
        <h2 id="types" className="section-title">Book types <span className="am">· የመጽሐፍ አይነቶች</span></h2>
        <div role="radiogroup" aria-label="Book type" style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {TYPES.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={type === t.id} onClick={() => setType(t.id)}
              style={{
                flex: '1 1 190px', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, borderRadius: 16, cursor: 'pointer', textAlign: 'left',
                background: type === t.id ? 'var(--green-50)' : '#fff', border: `2px solid ${type === t.id ? 'var(--green-600)' : 'var(--line)'}`,
              }}>
              <span style={{ height: 92, borderRadius: 8, background: t.thumb, display: 'flex', alignItems: 'flex-end', overflow: 'hidden', border: t.id === 'custom' ? '2px dashed #A89C80' : undefined }}>
                {t.band ? <span style={{ width: '100%', height: 10, background: 'repeating-linear-gradient(90deg,#078930 0 8px,#FCDD09 8px 16px,#DA121A 16px 24px)' }} /> : null}
              </span>
              <span className="stack" style={{ gap: 2 }}>
                <span style={{ fontWeight: 700 }}>{t.name}</span>
                <span className="am small" style={{ color: 'var(--green-600)' }}>{t.am}</span>
                <span className="muted small" style={{ lineHeight: 1.4 }}>{t.spec}</span>
              </span>
              {t.popular ? <span className="tag solid-yellow" style={{ alignSelf: 'flex-start', fontSize: 11 }}>MOST POPULAR</span> : null}
            </button>
          ))}
        </div>
      </section>

      <div className="row">
        <section className="card card-lg col-side stack" style={{ padding: 22, gap: 18 }} aria-labelledby="cust">
          <h2 id="cust" className="section-title">{isCustom ? 'Your custom book request' : 'Customize'}</h2>
          <label className="field">Trip
            <select className="select" value={tripId} onChange={(e) => setTripId(e.target.value)}>
              <option value="">All my memories ({memQ.data?.total ?? 0})</option>
              {trips.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.memoryCount} memories)</option>)}
            </select>
          </label>

          {isCustom ? (
            <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); window.alert('Custom requests are sent once the Books feature is connected to the backend.'); }}>
              <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>Tell us the book you imagine. Our team designs it from your memories and sends a preview and price before anything is printed.</p>
              <label className="field">Describe your book
                <textarea className="textarea" required placeholder="e.g. An anniversary book of our trip to Lalibela and Bahir Dar, Amharic captions, big photos, a map of where we went…" />
              </label>
              <label className="field">Budget (optional)<input className="input" placeholder="ETB" inputMode="numeric" /></label>
              <label className="field">Needed by<input className="input" type="date" /></label>
              <button type="submit" className="btn btn-primary">Send request</button>
            </form>
          ) : (
            <>
              <label className="field">Size
                <select className="select" defaultValue={current.size} key={current.id}>
                  {[...new Set([current.size, 'A4 landscape', 'A4 portrait', 'A5 portrait', '20 × 20 cm square'])].map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <Choice label="Cover design" value={cover} onChange={(v) => { setCover(v); setTab('cover'); }}
                options={[['tibeb', 'Tibeb border'], ['minimal', 'Minimal'], ['photo', 'Full photo']]} />
              <Choice label="Finish" value={finish} onChange={setFinish} options={[['hard', 'Hardcover'], ['soft', 'Softcover'], ['lay', 'Layflat']]} />
              <Choice label="Language" value={lang} onChange={setLang} options={[['en', 'English'], ['am', 'አማርኛ'], ['both', 'Both']]} />
              <fieldset style={{ border: 0, margin: 0, padding: 0 }} className="stack">
                <legend style={{ fontSize: 14, fontWeight: 600, padding: '0 0 6px' }}>Include in the book</legend>
                <label className="check highlight">
                  <input type="checkbox" checked={includeMap} onChange={() => { setIncludeMap(!includeMap); setTab('map'); }} />
                  <span><strong>Coverage map spread</strong>: your % of Ethiopia, route and pins</span>
                </label>
                <label className="check"><input type="checkbox" defaultChecked />Route map at the start of each trip</label>
                <label className="check"><input type="checkbox" defaultChecked />QR codes that play the video of each place</label>
                <label className="check"><input type="checkbox" defaultChecked />Ethiopian calendar dates</label>
                <label className="check"><input type="checkbox" />Badges &amp; travel stats page</label>
              </fieldset>
            </>
          )}
        </section>

        <section className="col-main stack" style={{ gap: 16 }} aria-labelledby="prev">
          <div className="card card-lg stack" style={{ padding: 22, gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <h2 id="prev" className="section-title">Live preview</h2>
              <div className="segmented" role="tablist" aria-label="Preview page" style={{ background: 'var(--sand)', border: 0 }}>
                {(['cover', 'map', 'page'] as Tab[]).map((t) => (
                  <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                    {t === 'cover' ? 'Cover' : t === 'map' ? 'Coverage map' : 'Memory page'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background: '#EAE4D5', borderRadius: 16, padding: '28px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 420, overflowX: 'auto' }}>
              {tab === 'cover' ? <CoverPreview cover={cover} title={bookTitle} /> : null}
              {tab === 'map' && includeMap ? (
                <div style={{ display: 'flex', boxShadow: '0 14px 34px rgba(29,26,20,0.22)', borderRadius: 4, overflow: 'hidden' }}>
                  <div className="stack" style={{ width: 250, background: '#fff', padding: '26px 22px', gap: 12, borderRight: '1px solid var(--line)' }}>
                    <span className="eyebrow" style={{ fontSize: 11 }}>My Ethiopia</span>
                    <span className="am-serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--green-900)' }}>የእኔ ኢትዮጵያ</span>
                    <span className="big-number" style={{ fontSize: 54, color: 'var(--green-600)' }}>{cov.percent}%</span>
                    <span className="small" style={{ lineHeight: 1.5 }}>explored · {cov.regionCount} of 14 regions · {cov.placeCount} places</span>
                    <FlagProgress percent={cov.percent} light />
                    <div className="stack small" style={{ gap: 6, marginTop: 'auto', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="dot" style={{ background: 'var(--flag-red)' }} />Places visited</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 18, borderTop: '2px dashed var(--green-900)' }} />Route</span>
                    </div>
                  </div>
                  <div className="stack" style={{ width: 340, background: '#FBF9F3', padding: 18, gap: 8 }}>
                    <EthiopiaMap pins={pinsFromMemories(memories)} width={300} />
                    <span className="muted" style={{ fontSize: 11 }}>Drawn from your memories' GPS points. Simplified outline.</span>
                  </div>
                </div>
              ) : null}
              {tab === 'map' && !includeMap ? (
                <div className="stack muted" style={{ alignItems: 'center', textAlign: 'center', maxWidth: 320 }}>
                  <strong style={{ color: 'var(--ink)' }}>Coverage map spread is off</strong>
                  Turn on "Coverage map spread" under Include in the book to add it.
                </div>
              ) : null}
              {tab === 'page' ? (
                <div style={{ display: 'flex', boxShadow: '0 14px 34px rgba(29,26,20,0.22)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: 290, minHeight: 360, background: firstMemory?.media.find((x) => x.kind === 'PHOTO') ? `url(${firstMemory.media.find((x) => x.kind === 'PHOTO')!.url}) center / cover` : '#C4A27A', display: 'grid', placeItems: 'center', color: '#3F2E1C', fontWeight: 600 }}>
                    {firstMemory?.media.some((x) => x.kind === 'PHOTO') ? null : 'Full-page photo'}
                  </div>
                  <div className="stack" style={{ width: 290, background: '#fff', padding: '26px 22px', gap: 10 }}>
                    <span className="eyebrow" style={{ fontSize: 11 }}>{firstMemory?.placeName ?? 'Place'}</span>
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700 }}>{firstMemory?.title ?? 'Your memory title'}</span>
                    {firstMemory ? <span className="am small" style={{ color: 'var(--green-600)' }}>{formatEthiopianAm(new Date(firstMemory.happenedAt))}</span> : null}
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)' }}>{(firstMemory?.story ?? 'Your story appears here.').slice(0, 220)}</p>
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div aria-hidden="true" style={{ width: 56, height: 56, border: '2px solid var(--ink)', borderRadius: 4, backgroundImage: 'linear-gradient(90deg,#1D1A14 50%,transparent 50%),linear-gradient(#1D1A14 50%,transparent 50%)', backgroundSize: '10px 10px' }} />
                      <span className="muted" style={{ fontSize: 12 }}>Scan to watch the video of this place</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="dark-panel">
            <div style={{ padding: '22px 24px', display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="stack" style={{ gap: 4 }}>
                <span className="small" style={{ color: 'var(--on-dark-muted)' }}>Your book</span>
                <span style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700 }}>{current.name}</span>
                <span style={{ fontSize: 14, color: 'var(--on-dark)' }}>
                  {isCustom ? 'Our team will send a design preview and price'
                    : [current.size, FINISH_LABEL[finish], current.pages, LANG_LABEL[lang], includeMap ? 'with coverage map' : 'no map'].join(' · ')}
                </span>
              </div>
              <div className="stack" style={{ gap: 2, textAlign: 'right' }}>
                <span className="small" style={{ color: 'var(--on-dark-muted)' }}>Price</span>
                <span className="big-number" style={{ fontSize: 26, color: 'var(--flag-yellow)' }}>ETB —</span>
                <span style={{ fontSize: 12, color: 'var(--on-dark-muted)' }}>Set when printing partners are configured</span>
              </div>
            </div>
            <div className="pills" style={{ padding: '0 24px 22px', alignItems: 'center' }}>
              <button type="button" className="btn btn-yellow" disabled>Order printed book · coming soon</button>
              <button type="button" className="btn btn-ghost-dark" disabled>Download PDF · coming soon</button>
              <span className="small" style={{ color: 'var(--on-dark-muted)' }}>Telebirr, CBE Birr or card</span>
            </div>
            <div className="tibeb" />
          </div>
        </section>
      </div>
    </>
  );
}

function Choice<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
      <div className="pills" role="radiogroup" aria-label={label}>
        {options.map(([v, l]) => (
          <button key={v} type="button" role="radio" className="pill" aria-checked={value === v} onClick={() => onChange(v)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function CoverPreview({ cover, title }: { cover: Cover; title: string }) {
  const bg = { tibeb: 'var(--green-900)', minimal: 'var(--bg)', photo: '#8A6A48' }[cover];
  const light = cover !== 'minimal';
  return (
    <div style={{
      width: 290, minHeight: 380, background: bg, display: 'flex', flexDirection: 'column', borderRadius: '4px 10px 10px 4px',
      boxShadow: '-6px 0 0 rgba(0,0,0,0.18) inset, 0 14px 34px rgba(29,26,20,0.25)',
      border: cover === 'minimal' ? '1px solid var(--line-2)' : undefined, borderLeft: cover === 'minimal' ? '6px solid var(--green-600)' : undefined,
    }}>
      {cover === 'tibeb' ? <div className="tibeb" /> : null}
      <div className="stack" style={{ flex: 1, padding: '26px 24px', gap: 10, justifyContent: 'flex-end' }}>
        {cover !== 'photo' ? <div style={{ height: 150, borderRadius: 6, background: '#C4A27A', marginBottom: 'auto' }} /> : null}
        <span className="am-serif" style={{ fontSize: 16, fontWeight: 700, color: light ? 'var(--flag-yellow)' : 'var(--green-600)' }}>የጉዞ ትዝታዬ</span>
        <span style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700, lineHeight: 1.15, color: light ? '#fff' : 'var(--ink)' }}>{title}</span>
        <span className="am" style={{ fontSize: 13, color: light ? 'var(--on-dark)' : 'var(--muted)' }}>{formatEthiopianAm(new Date())}</span>
      </div>
      {cover === 'tibeb' ? <div className="tibeb" /> : null}
    </div>
  );
}

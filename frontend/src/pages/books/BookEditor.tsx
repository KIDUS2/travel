import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/api';
import type { Book, BookPage, BookSettings, Memory, PageBackground, PageLayout } from '../../api/types';
import { pinsFromMemories } from '../../components/EthiopiaMap';
import { Icon } from '../../components/Icon';
import { computeCoverage } from '../../lib/coverage';
import {
  BACKGROUNDS, LAYOUTS, PAGE_MM, PAGE_RATIO, SIZE_LABEL, blankPage, changeLayout, layoutDef, mapPageText, newId,
  pagesForMemory, spreadsOf,
} from './layouts';
import { MEDIA_MIME, PageView, type PageContext } from './PageView';
import { BookPreview } from './BookPreview';
import './bookEditor.css';

type Panel = 'photos' | 'layouts' | 'add' | 'style';
type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';

export function BookEditor() {
  const { id = '' } = useParams();
  const [book, setBook] = useState<Book | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('photos');
  const [photoScope, setPhotoScope] = useState<'trip' | 'all'>('trip');
  const [save, setSave] = useState<SaveState>('saved');
  const [preview, setPreview] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(900);

  // Load the book and every memory (photos from other trips can be added too).
  useEffect(() => {
    Promise.all([api.getBook(id), api.listMemories({ size: 100 })])
      .then(([b, page]) => { setBook(b); setMemories(page.items); })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'Could not open this book'));
  }, [id]);

  // Fit the spread to the available width.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setStageW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [book !== null]);

  // Autosave 1.2 s after the last change.
  const firstLoad = useRef(true);
  useEffect(() => {
    if (!book) return;
    if (firstLoad.current) { firstLoad.current = false; return; }
    setSave('unsaved');
    const t = setTimeout(() => {
      setSave('saving');
      api.saveBook(book.id, { title: book.title, tripId: book.tripId, bookType: book.bookType, settings: book.settings, pages: book.pages })
        .then(() => setSave('saved'))
        .catch(() => setSave('error'));
    }, 1200);
    return () => clearTimeout(t);
  }, [book]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (save === 'unsaved' || save === 'saving') e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [save]);

  const mediaIndex = useMemo(() => {
    const map = new Map<string, { url: string; memory: Memory }>();
    for (const m of memories) for (const x of m.media) if (x.kind === 'PHOTO') map.set(x.id, { url: x.url, memory: m });
    return map;
  }, [memories]);

  const bookMemories = useMemo(
    () => (book?.tripId ? memories.filter((m) => m.tripId === book.tripId) : memories),
    [memories, book?.tripId],
  );

  const ctx: PageContext = useMemo(() => ({
    photoUrl: (mid) => (mid ? mediaIndex.get(mid)?.url : undefined),
    mapPins: pinsFromMemories(bookMemories).map((p) => ({ lat: p.lat, lng: p.lng, label: p.label })),
    visitedRegions: computeCoverage(bookMemories).visited,
  }), [mediaIndex, bookMemories]);

  const update = useCallback((fn: (b: Book) => Book) => setBook((b) => (b ? fn(b) : b)), []);
  const updatePage = useCallback((index: number, fn: (p: BookPage) => BookPage) =>
    update((b) => ({ ...b, pages: b.pages.map((p, i) => (i === index ? fn(p) : p)) })), [update]);

  if (loadError) return <div className="main"><div className="banner error">{loadError}</div><Link to="/books">Back to my books</Link></div>;
  if (!book) return <div className="main"><p className="muted">Opening your book…</p></div>;

  const pages = book.pages;
  const spreads = spreadsOf(pages);
  const spreadIndex = Math.max(0, spreads.findIndex((s) => s.includes(selected)));
  const spread = spreads[spreadIndex] ?? [];
  const current = pages[selected];
  const ratio = PAGE_RATIO[book.settings.size];
  const maxH = Math.max(320, window.innerHeight - 330);
  const pageW = Math.max(220, Math.min((stageW - 40) / 2, maxH * ratio));

  const usedMedia = new Set(pages.flatMap((p) => Object.values(p.slots)));
  const photoMemories = photoScope === 'trip' ? bookMemories : memories;

  function selectPage(i: number) { setSelected(i); setSlot(null); }

  function placePhoto(mediaId: string) {
    if (!current) return;
    const def = layoutDef(current.layout);
    const target = slot && def.photos.includes(slot) ? slot : def.photos.find((s) => !current.slots[s]) ?? def.photos[0];
    if (!target) {
      window.alert('This page has no photo box. Pick a layout with photos first.');
      setPanel('layouts');
      return;
    }
    updatePage(selected, (p) => ({ ...p, slots: { ...p.slots, [target]: mediaId } }));
    // Move on to the next empty box so tapping several photos fills the page.
    const nextEmpty = def.photos.find((s) => s !== target && !current.slots[s]);
    setSlot(nextEmpty ?? target);
  }

  function insertPages(newPages: BookPage[]) {
    const at = Math.max(1, selected + 1);
    update((b) => ({ ...b, pages: [...b.pages.slice(0, at), ...newPages, ...b.pages.slice(at)] }));
    setSelected(at);
    setSlot(null);
  }

  function movePage(dir: -1 | 1) {
    const to = selected + dir;
    if (selected === 0 || to < 1 || to >= pages.length) return;
    update((b) => {
      const next = [...b.pages];
      [next[selected], next[to]] = [next[to], next[selected]];
      return { ...b, pages: next };
    });
    setSelected(to);
  }

  function duplicatePage() {
    if (!current || selected === 0) return;
    insertPages([{ ...structuredClone(current), id: newId() }]);
  }

  function deletePage() {
    if (selected === 0) return;
    if (!window.confirm('Delete this page?')) return;
    update((b) => ({ ...b, pages: b.pages.filter((_, i) => i !== selected) }));
    setSelected(Math.max(1, selected - 1));
  }

  function setSettings(patch: Partial<BookSettings>) {
    update((b) => ({ ...b, settings: { ...b.settings, ...patch } }));
  }

  return (
    <div className="editor">
      <header className="editor-top">
        <div className="flagline" style={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
        <Link to="/books" className="btn" style={{ minHeight: 40 }}><span aria-hidden="true">←</span> My books</Link>
        <label style={{ flex: '1 1 220px', minWidth: 0 }}>
          <span className="sr-only">Book title</span>
          <input className="editor-title" value={book.title} maxLength={160}
            onChange={(e) => update((b) => ({ ...b, title: e.target.value }))} />
        </label>
        <span className={`save-state ${save}`} role="status">
          {save === 'saved' ? 'All changes saved' : save === 'saving' ? 'Saving…' : save === 'unsaved' ? 'Unsaved changes' : 'Could not save, retrying on next change'}
        </span>
        <button type="button" className="btn" style={{ minHeight: 40 }} onClick={() => setPreview(true)}><Icon name="book" size={18} />Preview</button>
        <button type="button" className="btn" style={{ minHeight: 40 }} onClick={() => printBook(book)}><Icon name="upload" size={18} />Print / PDF</button>
        <button type="button" className="btn btn-yellow" style={{ minHeight: 40 }} disabled title="Printing partners are not set up yet">Order book</button>
      </header>

      <div className="editor-body">
        <aside className="editor-panel" aria-label="Book tools">
          <div className="panel-tabs" role="tablist">
            {([['photos', 'Photos', 'photo'], ['layouts', 'Layouts', 'chart'], ['add', 'Add pages', 'plus'], ['style', 'Style', 'star']] as [Panel, string, string][]).map(([k, label, icon]) => (
              <button key={k} type="button" role="tab" aria-selected={panel === k} onClick={() => setPanel(k)}>
                <Icon name={icon} size={18} /><span>{label}</span>
              </button>
            ))}
          </div>

          <div className="panel-content">
            {panel === 'photos' ? (
              <>
                <p className="panel-hint">Drag a photo onto a photo box, or tap a box on the page and then tap a photo.</p>
                <div className="segmented" style={{ background: 'var(--sand)', border: 0 }}>
                  <button type="button" aria-pressed={photoScope === 'trip'} onClick={() => setPhotoScope('trip')}>{book.tripId ? 'This trip' : 'All'}</button>
                  <button type="button" aria-pressed={photoScope === 'all'} onClick={() => setPhotoScope('all')}>All memories</button>
                </div>
                {photoMemories.filter((m) => m.media.some((x) => x.kind === 'PHOTO')).map((m) => (
                  <div key={m.id} className="stack" style={{ gap: 6 }}>
                    <span className="small" style={{ fontWeight: 600 }}>{m.title}</span>
                    <div className="photo-grid">
                      {m.media.filter((x) => x.kind === 'PHOTO').map((x) => (
                        <button key={x.id} type="button" className="photo-thumb" draggable
                          onDragStart={(e) => { e.dataTransfer.setData(MEDIA_MIME, x.id); e.dataTransfer.effectAllowed = 'copy'; }}
                          onClick={() => placePhoto(x.id)} aria-label={`Place photo from ${m.title}`}
                          style={{ backgroundImage: `url("${x.url}")` }}>
                          {usedMedia.has(x.id) ? <span className="used" aria-label="Used in book">✓</span> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {!photoMemories.some((m) => m.media.length) ? (
                  <p className="panel-hint">No photos yet. <Link to="/memories">Add photos to your memories</Link> and they appear here.</p>
                ) : null}
              </>
            ) : null}

            {panel === 'layouts' ? (
              <>
                <p className="panel-hint">Choose a layout for page {selected === 0 ? 'cover' : selected}. Photos and text carry over.</p>
                <div className="layout-grid">
                  {LAYOUTS.filter((l) => (selected === 0 ? l.id === 'cover' || l.id === 'full-photo' : l.id !== 'cover')).map((l) => (
                    <button key={l.id} type="button" className="layout-btn" aria-pressed={current?.layout === l.id}
                      onClick={() => updatePage(selected, (p) => changeLayout(p, l.id))}>
                      <LayoutIcon layout={l.id} />
                      <span>{l.label}</span>
                      <span className="am small muted">{l.am}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {panel === 'add' ? (
              <>
                <p className="panel-hint">New pages go after the selected page.</p>
                <div className="stack" style={{ gap: 8 }}>
                  {(['photo-text', 'full-photo', 'two-photos', 'grid-3', 'story', 'title'] as PageLayout[]).map((l) => (
                    <button key={l} type="button" className="add-btn" onClick={() => insertPages([blankPage(l)])}>
                      <LayoutIcon layout={l} small /><span>{layoutDef(l).label}</span>
                    </button>
                  ))}
                  <button type="button" className="add-btn" onClick={() => insertPages([{ ...blankPage('map', 'cream'), slots: mapPageText(bookMemories) }])}>
                    <LayoutIcon layout="map" small /><span>Coverage map page</span>
                  </button>
                </div>
                <h3 className="small" style={{ margin: '16px 0 6px' }}>Add a memory as pages</h3>
                <div className="stack" style={{ gap: 6 }}>
                  {photoMemories.map((m) => (
                    <button key={m.id} type="button" className="add-btn" onClick={() => insertPages(pagesForMemory(m, book.settings))}>
                      <span className="thumb" style={{ width: 40, height: 40, borderRadius: 6, backgroundImage: m.media[0] ? `url("${m.media[0].url}")` : undefined }} />
                      <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                        <span>{m.title}</span>
                        <span className="muted small">{m.placeName ?? ''} · {m.media.filter((x) => x.kind === 'PHOTO').length} photos</span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {panel === 'style' ? (
              <>
                <h3 className="small" style={{ margin: '0 0 8px' }}>Page background</h3>
                <div className="bg-grid">
                  {BACKGROUNDS.map((bg) => (
                    <button key={bg.id} type="button" className="bg-btn" aria-pressed={current?.background === bg.id}
                      onClick={() => updatePage(selected, (p) => ({ ...p, background: bg.id }))}>
                      <span className="swatch" style={{ background: bg.swatch }} />{bg.label}
                    </button>
                  ))}
                </div>
                <button type="button" className="btn" style={{ marginTop: 10, width: '100%' }}
                  onClick={() => current && update((b) => ({ ...b, pages: b.pages.map((p, i) => (i === 0 ? p : { ...p, background: current.background as PageBackground })) }))}>
                  Use this background on all pages
                </button>

                <h3 className="small" style={{ margin: '20px 0 8px' }}>Book size</h3>
                <select className="select" value={book.settings.size} onChange={(e) => setSettings({ size: e.target.value as BookSettings['size'] })}>
                  {(Object.keys(SIZE_LABEL) as BookSettings['size'][]).map((s) => <option key={s} value={s}>{SIZE_LABEL[s]}</option>)}
                </select>
                <h3 className="small" style={{ margin: '20px 0 8px' }}>Finish</h3>
                <div className="pills">
                  {(['hard', 'soft', 'lay'] as const).map((f) => (
                    <button key={f} type="button" className="pill" aria-pressed={book.settings.finish === f} onClick={() => setSettings({ finish: f })}>
                      {f === 'hard' ? 'Hardcover' : f === 'soft' ? 'Softcover' : 'Layflat'}
                    </button>
                  ))}
                </div>
                <label className="check" style={{ marginTop: 14, padding: 0 }}>
                  <input type="checkbox" checked={book.settings.ethiopianDates} onChange={(e) => setSettings({ ethiopianDates: e.target.checked })} />
                  Ethiopian calendar dates on new pages
                </label>
              </>
            ) : null}
          </div>
        </aside>

        <section className="editor-stage" aria-label="Pages">
          <div className="stage-nav">
            <button type="button" className="icon-btn" aria-label="Previous pages" disabled={spreadIndex === 0}
              onClick={() => selectPage(spreads[spreadIndex - 1][0])}>‹</button>
            <span className="small muted">
              {spread.length === 1 && spread[0] === 0 ? 'Cover' : `Pages ${spread.join('–')}`} of {pages.length - 1} · {SIZE_LABEL[book.settings.size]}
            </span>
            <button type="button" className="icon-btn" aria-label="Next pages" disabled={spreadIndex >= spreads.length - 1}
              onClick={() => selectPage(spreads[spreadIndex + 1][0])}>›</button>
          </div>
          <div ref={stageRef} className="spread-wrap">
            <div className="spread" style={{ justifyContent: spread.length === 1 && spread[0] === 0 ? 'flex-end' : 'center', width: pageW * 2 + 4 }}>
              {spread.length === 1 && spread[0] === 0 ? <div style={{ width: pageW }} aria-hidden="true" /> : null}
              {spread.map((i) => (
                <PageView key={pages[i].id} page={pages[i]} settings={book.settings} ctx={ctx} width={pageW} editable
                  selected={i === selected} selectedSlot={i === selected ? slot : null} pageNumber={i}
                  onSelect={() => { if (i !== selected) { setSelected(i); setSlot(null); } }}
                  onSlotSelect={(s) => { setSlot(s); if (layoutDef(pages[i].layout).photos.includes(s)) setPanel('photos'); }}
                  onText={(s, v) => updatePage(i, (p) => ({ ...p, slots: { ...p.slots, [s]: v } }))}
                  onPhoto={(s, mid) => updatePage(i, (p) => {
                    const slots = { ...p.slots };
                    if (mid) slots[s] = mid; else delete slots[s];
                    return { ...p, slots };
                  })} />
              ))}
            </div>
          </div>
          <div className="page-actions" aria-label="Page actions">
            <span className="small" style={{ fontWeight: 600 }}>{selected === 0 ? 'Cover' : `Page ${selected}`} · {layoutDef(current?.layout ?? 'story').label}</span>
            <button type="button" className="btn" onClick={() => movePage(-1)} disabled={selected <= 1}>Move left</button>
            <button type="button" className="btn" onClick={() => movePage(1)} disabled={selected === 0 || selected >= pages.length - 1}>Move right</button>
            <button type="button" className="btn" onClick={duplicatePage} disabled={selected === 0}>Duplicate</button>
            <button type="button" className="btn" onClick={deletePage} disabled={selected === 0} style={{ color: '#8a0c12' }}><Icon name="trash" size={18} />Delete</button>
          </div>
        </section>
      </div>

      <nav className="page-strip" aria-label="All pages">
        {pages.map((p, i) => (
          <button key={p.id} type="button" className="strip-item" aria-current={i === selected} onClick={() => selectPage(i)}
            aria-label={i === 0 ? 'Cover' : `Page ${i}`}>
            <PageView page={p} settings={book.settings} ctx={ctx} width={Math.round(70 * Math.min(ratio, 1.45))} />
            <span>{i === 0 ? 'Cover' : i}</span>
          </button>
        ))}
        <button type="button" className="strip-add" onClick={() => insertPages([blankPage('photo-text')])} aria-label="Add a page after the selected one">
          <Icon name="plus" size={22} /><span>Page</span>
        </button>
      </nav>

      {preview ? <BookPreview book={book} ctx={ctx} onClose={() => setPreview(false)} /> : null}
      <PrintPages book={book} ctx={ctx} />
    </div>
  );
}

function LayoutIcon({ layout, small = false }: { layout: PageLayout; small?: boolean }) {
  const box = (s: React.CSSProperties) => <span style={{ background: '#C9BDA4', borderRadius: 2, ...s }} />;
  const line = (w: string) => <span style={{ height: 3, width: w, background: '#8A7D63', borderRadius: 2 }} />;
  const size = small ? { width: 40, height: 30 } : { width: 72, height: 52 };
  const inner = () => {
    switch (layout) {
      case 'cover': return <><span style={{ flex: 1, display: 'flex' }}>{box({ flex: 1 })}</span>{line('60%')}</>;
      case 'title': return <span style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>{line('70%')}{line('40%')}</span>;
      case 'full-photo': return <span style={{ flex: 1, display: 'flex' }}>{box({ flex: 1 })}</span>;
      case 'photo-text': return <span style={{ flex: 1, display: 'flex', gap: 3 }}>{box({ flex: 1.2 })}<span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>{line('90%')}{line('70%')}{line('80%')}</span></span>;
      case 'two-photos': return <span style={{ flex: 1, display: 'flex', gap: 3 }}>{box({ flex: 1 })}{box({ flex: 1 })}</span>;
      case 'grid-3': return <span style={{ flex: 1, display: 'flex', gap: 3 }}>{box({ flex: 2 })}<span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>{box({ flex: 1 })}{box({ flex: 1 })}</span></span>;
      case 'story': return <span style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>{line('60%')}{line('85%')}{line('80%')}{line('70%')}</span>;
      case 'map': return <span style={{ flex: 1, display: 'grid', placeItems: 'center', color: '#06742A' }}><Icon name="map" size={small ? 16 : 24} /></span>;
      default: return null;
    }
  };
  return (
    <span aria-hidden="true" style={{ ...size, flex: 'none', background: '#fff', border: '1px solid var(--line-2)', borderRadius: 4, padding: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {inner()}
    </span>
  );
}

/** Hidden pages laid out at true paper size, shown only when printing. */
function PrintPages({ book, ctx }: { book: Book; ctx: PageContext }) {
  const [wMm] = PAGE_MM[book.settings.size];
  const widthPx = Math.round(wMm * 3.7795);
  return (
    <div className="print-root" aria-hidden="true">
      {book.pages.map((p, i) => (
        <div key={p.id} className="print-page">
          <PageView page={p} settings={book.settings} ctx={ctx} width={widthPx} pageNumber={i} />
        </div>
      ))}
    </div>
  );
}

function printBook(book: Book) {
  const [w, h] = PAGE_MM[book.settings.size];
  const style = document.createElement('style');
  style.id = 'teguwaz-print-size';
  style.textContent = `@page { size: ${w}mm ${h}mm; margin: 0; }`;
  document.getElementById('teguwaz-print-size')?.remove();
  document.head.appendChild(style);
  window.print();
}

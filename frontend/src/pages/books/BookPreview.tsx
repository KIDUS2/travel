import { useEffect, useRef, useState } from 'react';
import type { Book } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Book3D } from './Book3D';
import { PAGE_RATIO, spreadsOf } from './layouts';
import { PageView, type PageContext } from './PageView';
import './bookPreview.css';

/**
 * Reads like a real book: the closed cover first, then open spreads with a
 * center fold and page edges; pages turn with an animation. Arrow keys work.
 */
export function BookPreview({ book, ctx, onClose }: { book: Book; ctx: PageContext; onClose: () => void }) {
  const spreads = spreadsOf(book.pages);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);
  const closeRef = useRef<HTMLButtonElement>(null);

  const go = (to: number) => {
    if (to < 0 || to >= spreads.length) return;
    setDir(to > i ? 'fwd' : 'back');
    setI(to);
  };

  useEffect(() => {
    closeRef.current?.focus();
    const onResize = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(i + 1);
      if (e.key === 'ArrowLeft') go(i - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const ratio = PAGE_RATIO[book.settings.size];
  const pageW = Math.floor(Math.min((vw - 220) / 2, (vh - 260) * ratio));
  const pageH = Math.round(pageW / ratio);
  const spread = spreads[i] ?? [];
  const onCover = i === 0;
  const left = spread.length === 2 ? spread[0] : null;
  const right = spread.length === 2 ? spread[1] : spread[0];
  const edge = Math.min(10, Math.max(3, Math.round(book.pages.length / 4)));
  const leftEdges = Math.max(1, Math.round((edge * i) / Math.max(1, spreads.length - 1)));
  const rightEdges = Math.max(1, edge - leftEdges);

  return (
    <div className="bp-backdrop" role="dialog" aria-modal="true" aria-label={`Preview of ${book.title}`}>
      <header className="bp-top">
        <div className="stack" style={{ gap: 2 }}>
          <strong style={{ fontFamily: 'var(--font-head)', fontSize: 18 }}>{book.title}</strong>
          <span className="small" style={{ color: 'var(--on-dark-muted)' }}>{book.pages.length - 1} pages · preview</span>
        </div>
        <button ref={closeRef} type="button" className="bp-close" onClick={onClose} aria-label="Close preview"><Icon name="x" /></button>
      </header>

      <div className="bp-stage">
        <button type="button" className="bp-arrow" aria-label="Previous page" disabled={i === 0} onClick={() => go(i - 1)}>‹</button>

        {onCover ? (
          <button type="button" className="bp-cover" onClick={() => go(1)} aria-label="Open the book">
            <Book3D page={book.pages[0]} settings={book.settings} height={Math.min(pageH, vh - 300)} pageCount={book.pages.length} ctx={ctx} />
            <span className="bp-hint">Click or press → to open</span>
          </button>
        ) : (
          <div className="bp-book" style={{ width: pageW * 2, height: pageH }}>
            <div className="bp-leaf bp-left" style={{ width: pageW, height: pageH, boxShadow: stack('left', leftEdges) }}>
              {left != null ? (
                <div key={`l-${book.pages[left].id}`} className={dir === 'back' ? 'bp-turn-back' : undefined}>
                  <PageView page={book.pages[left]} settings={book.settings} ctx={ctx} width={pageW} pageNumber={left} />
                </div>
              ) : <div className="bp-endpaper" />}
              <span className="bp-gutter-left" />
            </div>
            <div className="bp-leaf bp-right" style={{ width: pageW, height: pageH, boxShadow: stack('right', rightEdges) }}>
              {right != null && right !== 0 ? (
                <div key={`r-${book.pages[right].id}`} className={dir === 'fwd' ? 'bp-turn-fwd' : undefined}>
                  <PageView page={book.pages[right]} settings={book.settings} ctx={ctx} width={pageW} pageNumber={right} />
                </div>
              ) : <div className="bp-endpaper" />}
              <span className="bp-gutter-right" />
            </div>
          </div>
        )}

        <button type="button" className="bp-arrow" aria-label="Next page" disabled={i >= spreads.length - 1} onClick={() => go(i + 1)}>›</button>
      </div>

      <footer className="bp-foot">
        <span className="bp-count">{onCover ? 'Cover' : spread.length === 2 ? `Pages ${spread[0]}–${spread[1]}` : `Page ${spread[0]}`} · {i + 1} of {spreads.length}</span>
        <nav className="bp-thumbs" aria-label="Jump to pages">
          {spreads.map((s, si) => (
            <button key={si} type="button" className="bp-thumb" aria-current={si === i} onClick={() => go(si)} aria-label={si === 0 ? 'Cover' : `Pages ${s.join(' and ')}`}>
              {s.map((p) => <PageView key={book.pages[p].id} page={book.pages[p]} settings={book.settings} ctx={ctx} width={Math.round(34 * Math.min(ratio, 1.45))} />)}
            </button>
          ))}
        </nav>
      </footer>
    </div>
  );
}

/** Stacked page edges on the outer side of each page; more pages on the side you haven't read. */
function stack(side: 'left' | 'right', n: number) {
  const sign = side === 'left' ? -1 : 1;
  const layers = Array.from({ length: n }, (_, k) => `${sign * (k + 1) * 2}px ${k + 1}px 0 ${k % 2 ? '#E6DDCB' : '#F7F2E7'}`);
  return [...layers, `${sign * 4}px 18px 30px rgba(0,0,0,0.45)`].join(', ');
}

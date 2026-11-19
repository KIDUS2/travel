import { useEffect, useState } from 'react';
import type { Book } from '../../api/types';
import { Icon } from '../../components/Icon';
import { PAGE_RATIO, spreadsOf } from './layouts';
import { PageView, type PageContext } from './PageView';

/** Read-only flip-through of the book, one spread at a time. Arrow keys turn pages. */
export function BookPreview({ book, ctx, onClose }: { book: Book; ctx: PageContext; onClose: () => void }) {
  const spreads = spreadsOf(book.pages);
  const [i, setI] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((x) => Math.min(x + 1, spreads.length - 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, spreads.length]);

  const ratio = PAGE_RATIO[book.settings.size];
  const pageW = Math.min((window.innerWidth - 160) / 2, (window.innerHeight - 180) * ratio);
  const spread = spreads[i] ?? [];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Preview of ${book.title}`} style={{ background: 'rgba(11,30,20,0.92)' }}>
      <button type="button" className="icon-btn" onClick={onClose} aria-label="Close preview" style={{ position: 'absolute', top: 16, right: 16 }}><Icon name="x" /></button>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button type="button" className="icon-btn" aria-label="Previous" disabled={i === 0} onClick={() => setI(i - 1)}>‹</button>
          <div style={{ display: 'flex', width: pageW * 2, justifyContent: i === 0 ? 'flex-end' : 'center', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.45))' }}>
            {spread.map((p) => <PageView key={book.pages[p].id} page={book.pages[p]} settings={book.settings} ctx={ctx} width={pageW} pageNumber={p} />)}
          </div>
          <button type="button" className="icon-btn" aria-label="Next" disabled={i >= spreads.length - 1} onClick={() => setI(i + 1)}>›</button>
        </div>
        <span style={{ color: '#E9F1EA', fontSize: 14 }}>{i === 0 ? 'Cover' : `Pages ${spread.join('–')}`} · {i + 1} / {spreads.length}</span>
      </div>
    </div>
  );
}

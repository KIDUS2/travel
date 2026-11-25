import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api } from '../api/api';
import type { PrintFile } from '../api/types';
import { useMe } from '../auth/MeProvider';
import { Icon } from '../components/Icon';
import { PAGE_MM } from './books/layouts';
import { PageView, type PageContext } from './books/PageView';

/** Admin-only: the ordered book at real paper size, ready to print or save as a print-ready PDF. */
export function AdminOrderPrint() {
  const { id = '' } = useParams();
  const { me, isAdmin } = useMe();
  const [file, setFile] = useState<PrintFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    api.adminOrderPrintFile(id).then(setFile).catch((e: Error) => setError(e.message));
  }, [id, isAdmin]);

  useEffect(() => {
    if (!file) return;
    const [w, h] = PAGE_MM[file.settings.size];
    const style = document.createElement('style');
    style.textContent = `@page { size: ${w}mm ${h}mm; margin: 0; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [file]);

  if (me && !isAdmin) return <Navigate to="/" replace />;
  if (error) return <div className="main"><div className="banner error">{error}</div></div>;
  if (!file) return <div className="main"><p className="muted">Loading the print file…</p></div>;

  const ctx: PageContext = { photoUrl: (mid) => (mid ? file.photoUrls[mid] : undefined), mapPins: [], visitedRegions: new Set() };
  const [wMm] = PAGE_MM[file.settings.size];
  const widthPx = Math.round(wMm * 3.7795);
  const missing = file.pages.flatMap((p) => Object.values(p.slots)).filter((v) => /^[0-9a-f-]{36}$/i.test(v) && !file.photoUrls[v]).length;

  return (
    <div className="print-file">
      <header className="print-file-bar">
        <Link to="/admin/orders" className="btn"><span aria-hidden="true">←</span> Orders</Link>
        <strong style={{ flex: 1 }}>{file.title} · {file.pages.length} pages</strong>
        {missing ? <span className="tag order-bad">{missing} photo{missing === 1 ? '' : 's'} no longer available</span> : null}
        <button type="button" className="btn btn-primary" onClick={() => window.print()}><Icon name="download" size={18} />Print / save PDF</button>
      </header>
      <div className="print-file-pages">
        {file.pages.map((p, i) => (
          <div key={p.id} className="print-file-page">
            <PageView page={p} settings={file.settings} ctx={ctx} width={widthPx} pageNumber={i} />
          </div>
        ))}
      </div>
    </div>
  );
}

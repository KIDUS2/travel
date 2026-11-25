import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api/api';
import type { BookOrder, OrderStatus } from '../api/types';
import { useMe } from '../auth/MeProvider';
import { PageHeader } from '../components/PageHeader';
import { useAsync } from '../lib/useAsync';
import { SIZE_LABEL } from './books/layouts';
import { StatusTag } from './orders/Orders';
import { DELIVERY, etb, FINISH_LABEL } from './orders/orderLabels';

const FILTERS: { id: OrderStatus | ''; label: string }[] = [
  { id: 'PAID', label: 'To print' }, { id: 'PRINTING', label: 'Printing' }, { id: 'SHIPPED', label: 'On the way' },
  { id: 'DELIVERED', label: 'Delivered' }, { id: 'PENDING_PAYMENT', label: 'Unpaid' }, { id: '', label: 'All' },
];
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  PAID: { status: 'PRINTING', label: 'Start printing' },
  PRINTING: { status: 'SHIPPED', label: 'Mark sent / ready for pickup' },
  SHIPPED: { status: 'DELIVERED', label: 'Mark delivered' },
};

/** Admin-only: paid orders to print and deliver. */
export function AdminOrders() {
  const { me, isAdmin } = useMe();
  const [filter, setFilter] = useState<OrderStatus | ''>('PAID');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const q = useAsync(() => (isAdmin ? api.adminOrders(filter || undefined) : Promise.resolve([] as BookOrder[])), [isAdmin, filter]);

  if (me && !isAdmin) return <Navigate to="/" replace />;

  async function move(o: BookOrder, status: OrderStatus, ask?: string) {
    const note = ask !== undefined ? window.prompt(ask, '') : undefined;
    if (note === null) return;
    setBusy(o.id); setError(null);
    try {
      await api.adminUpdateOrder(o.id, status, note || undefined);
      await q.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the order');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader title="Print orders" am="የህትመት ትዕዛዞች" subtitle="Paid books to print, send and deliver. Each order keeps the pages exactly as they were when ordered." />
      <div className="pills" role="group" aria-label="Filter orders">
        {FILTERS.map((f) => <button key={f.label} type="button" className="pill dark" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>)}
      </div>
      {error ? <div className="banner error">{error}</div> : null}
      {q.error ? <div className="banner error">{q.error}</div> : null}
      {!q.loading && !(q.data ?? []).length ? <div className="card empty"><p className="muted" style={{ margin: 0 }}>No orders here.</p></div> : null}
      <div className="stack" style={{ gap: 12 }}>
        {(q.data ?? []).map((o) => {
          const next = NEXT[o.status];
          return (
            <article key={o.id} className="card card-pad stack" style={{ gap: 10 }} aria-label={o.bookTitle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <strong style={{ fontSize: 17 }}>{o.bookTitle}</strong>
                <StatusTag order={o} />
              </div>
              <span className="small">{o.copies} × {SIZE_LABEL[o.size]} {FINISH_LABEL[o.finish]}, {o.printedPages} pages · {etb(o.total)}{o.paymentReference ? ` · ${o.paymentMethod ?? 'Chapa'} ${o.paymentReference}` : ''}</span>
              <span className="small"><strong>{o.recipientName}</strong> · <a href={`tel:${o.phone}`}>{o.phone}</a> · {DELIVERY[o.deliveryMethod].en}{o.address ? ` · ${[o.address, o.city].filter(Boolean).join(', ')}` : ''}</span>
              {o.notes ? <span className="small muted">Customer note: {o.notes}</span> : null}
              {o.adminNote ? <span className="small muted">Team note: {o.adminNote}</span> : null}
              <div className="pills">
                {o.status !== 'PENDING_PAYMENT' && o.status !== 'PAYMENT_FAILED' ? <Link to={`/admin/orders/${o.id}/print`} className="btn">Open print file</Link> : null}
                {next ? <button type="button" className="btn btn-primary" disabled={busy === o.id} onClick={() => void move(o, next.status, next.status === 'SHIPPED' ? 'Note for the customer (e.g. courier and tracking, or "ready at the pickup point"):' : undefined)}>{next.label}</button> : null}
                {o.status !== 'CANCELLED' && o.status !== 'DELIVERED' ? (
                  <button type="button" className="btn btn-danger" disabled={busy === o.id}
                    onClick={() => void move(o, 'CANCELLED', o.status === 'PENDING_PAYMENT' ? 'Reason (optional):' : 'Reason. Refund paid orders in the Chapa dashboard.')}>Cancel</button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/api';
import type { BookOrder } from '../../api/types';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { useAsync } from '../../lib/useAsync';
import { SIZE_LABEL } from '../books/layouts';
import { DELIVERY, etb, FINISH_LABEL, STATUS, STEPS } from './orderLabels';

export function StatusTag({ order }: { order: BookOrder }) {
  const s = STATUS[order.status];
  return <span className={`tag order-${s.tone}`} style={{ alignSelf: 'flex-start' }}>{s.en} <span className="am">· {s.am}</span></span>;
}

/** All the traveler's printed book orders. */
export function Orders() {
  const q = useAsync(() => api.listOrders(), []);
  const orders = q.data ?? [];
  return (
    <>
      <PageHeader title="My book orders" am="ትዕዛዞቼ" subtitle="Printed books you ordered, and where each one is."
        actions={<Link to="/books" className="btn"><Icon name="book" size={18} />My books</Link>} />
      {q.error ? <div className="banner error">{q.error}</div> : null}
      {!q.loading && !orders.length ? (
        <div className="card empty">
          <p style={{ fontSize: 17, margin: '0 0 12px', color: 'var(--ink)' }}>No orders yet.</p>
          <Link to="/books" className="btn btn-primary">Open a book and press "Order book"</Link>
        </div>
      ) : null}
      <div className="stack" style={{ gap: 12 }}>
        {orders.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="card card-pad order-row">
            <span className="stack" style={{ gap: 4, minWidth: 0 }}>
              <strong className="ellipsis">{o.bookTitle}</strong>
              <span className="muted small">{new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {o.copies} cop{o.copies === 1 ? 'y' : 'ies'} · {DELIVERY[o.deliveryMethod].en}</span>
            </span>
            <StatusTag order={o} />
            <strong>{etb(o.total)}</strong>
          </Link>
        ))}
      </div>
    </>
  );
}

/** One order. Coming back from Chapa, it checks the payment a few times until it is confirmed. */
export function OrderDetail() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const [order, setOrder] = useState<BookOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState(0);

  useEffect(() => {
    let live = true;
    api.getOrder(id).then((o) => live && setOrder(o)).catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, [id, checks]);

  // After payment, Chapa can take a few seconds to confirm: check again up to 6 times.
  useEffect(() => {
    if (order?.status !== 'PENDING_PAYMENT' || checks >= 6) return;
    const t = setTimeout(() => setChecks((c) => c + 1), 3000);
    return () => clearTimeout(t);
  }, [order, checks]);

  if (error) return <div className="banner error">{error}</div>;
  if (!order) return <p className="muted">Loading your order…</p>;

  const stepIndex = STEPS.indexOf(order.status);
  const justPaid = order.status === 'PAID' && (params.has('demo') || checks > 0);

  return (
    <>
      <PageHeader title={order.bookTitle} am="ትዕዛዝ" eyebrow={`Order · ${new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        actions={<Link to="/orders" className="btn">All orders</Link>} />

      {justPaid ? <div className="banner success" role="status">Payment received. Thank you! Your book is in the print queue.</div> : null}

      <div className="row">
        <section className="card card-pad stack col-main" style={{ gap: 16 }} aria-label="Status">
          <StatusTag order={order} />
          {order.status === 'PENDING_PAYMENT' ? (
            <div className="stack" style={{ gap: 10 }}>
              <p style={{ margin: 0 }}>{checks < 6 ? 'Checking your payment with Chapa…' : 'We have not received the payment yet.'}</p>
              {order.checkoutUrl ? <a className="btn btn-yellow" href={order.checkoutUrl}>Pay {etb(order.total)} now</a> : null}
              <span className="muted small">Paid already? It can take a minute to confirm. This page updates by itself.</span>
            </div>
          ) : null}
          {stepIndex >= 0 ? (
            <ol className="order-steps">
              {STEPS.map((s, i) => (
                <li key={s} className={i <= stepIndex ? 'done' : ''}>
                  <span className="dot" />{STATUS[s].en}
                </li>
              ))}
            </ol>
          ) : null}
          {order.adminNote ? <div className="banner info"><strong>From the print team:</strong> {order.adminNote}</div> : null}
        </section>

        <aside className="card card-pad stack col-side" style={{ gap: 10 }} aria-label="Order details">
          <h2 className="section-title" style={{ fontSize: 18 }}>Details</h2>
          <dl className="order-dl">
            <dt>Book</dt><dd>{SIZE_LABEL[order.size]} · {FINISH_LABEL[order.finish]} · {order.printedPages} pages</dd>
            <dt>Copies</dt><dd>{order.copies} × {etb(order.unitPrice)}</dd>
            <dt>Delivery</dt><dd>{DELIVERY[order.deliveryMethod].en}{order.deliveryFee ? ` · ${etb(order.deliveryFee)}` : ''}</dd>
            <dt>Total</dt><dd><strong>{etb(order.total)}</strong></dd>
            <dt>Recipient</dt><dd>{order.recipientName} · {order.phone}</dd>
            {order.address ? <><dt>Address</dt><dd>{[order.address, order.city].filter(Boolean).join(', ')}</dd></> : null}
            {order.paymentReference ? <><dt>Payment</dt><dd>{order.paymentMethod ?? 'Chapa'} · {order.paymentReference}</dd></> : null}
          </dl>
        </aside>
      </div>
    </>
  );
}

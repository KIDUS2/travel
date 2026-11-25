import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api';
import { ApiError } from '../../api/client';
import type { Book, DeliveryMethod, PrintingInfo, PrintQuote } from '../../api/types';
import { useMe } from '../../auth/MeProvider';
import { Icon } from '../../components/Icon';
import { DELIVERY, etb, FINISH_LABEL } from '../orders/orderLabels';
import { SIZE_LABEL } from './layouts';

/** Order printed copies: copies, delivery, contact, live price in birr, then pay on Chapa's page. */
export function OrderDialog({ book, onClose }: { book: Book; onClose: () => void }) {
  const { me } = useMe();
  const navigate = useNavigate();
  const [info, setInfo] = useState<PrintingInfo | null>(null);
  const [copies, setCopies] = useState(1);
  const [delivery, setDelivery] = useState<DeliveryMethod>('PICKUP');
  const [name, setName] = useState(me?.displayName ?? '');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [quote, setQuote] = useState<PrintQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void api.printingInfo().then(setInfo).catch((e: Error) => setError(e.message)); }, []);
  useEffect(() => {
    let live = true;
    api.quote(book.id, copies, delivery).then((q) => live && setQuote(q)).catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, [book.id, copies, delivery]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  async function pay(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { checkoutUrl } = await api.createOrder(book.id, {
        copies, delivery, recipientName: name.trim(), phone: phone.trim(),
        city: delivery === 'REGIONAL' ? city.trim() : delivery === 'ADDIS' ? 'Addis Ababa' : null,
        address: delivery === 'PICKUP' ? null : address.trim(), notes: notes.trim() || null,
      });
      // Chapa's page is on another site; the demo checkout is a page in this app.
      if (checkoutUrl.startsWith('/')) navigate(checkoutUrl); else window.location.assign(checkoutUrl);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not start the payment');
      setBusy(false);
    }
  }

  const designed = Math.max(0, book.pages.length - 1);
  const unavailable = info && !info.paymentsAvailable;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="od-title" style={{ width: 'min(720px, 100%)' }}>
        <div className="tibeb" />
        <form onSubmit={pay} className="stack" style={{ padding: 24, gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 id="od-title" className="section-title" style={{ fontSize: 24 }}>Order printed book <span className="am">· መጽሐፍ ይዘዙ</span></h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
          </div>

          <div className="order-book">
            <strong>{book.title}</strong>
            <span className="muted small">{SIZE_LABEL[book.settings.size]} · {FINISH_LABEL[book.settings.finish]} · {designed} designed page{designed === 1 ? '' : 's'}
              {quote && quote.printedPages !== designed ? ` · printed as ${quote.printedPages} pages` : ''}</span>
          </div>

          {unavailable ? <div className="banner info">Ordering is not set up on this server yet. The server owner needs to add a Chapa key. You can still download the PDF.</div> : null}
          {info?.testMode ? <div className="banner info">Test mode: Chapa will show test payment options and no real money is taken.</div> : null}
          {error ? <div className="banner error">{error}</div> : null}

          <div className="grid-3" style={{ gridTemplateColumns: '140px 1fr', alignItems: 'end' }}>
            <label className="field">Copies
              <input className="input" type="number" min={1} max={50} value={copies}
                onChange={(e) => setCopies(Math.min(50, Math.max(1, Number(e.target.value) || 1)))} />
            </label>
            <span className="muted small" style={{ paddingBottom: 12 }}>Extra copies make good gifts for family who traveled with you.</span>
          </div>

          <div className="field">Delivery
            <div className="delivery-pick" role="radiogroup" aria-label="Delivery">
              {(Object.keys(DELIVERY) as DeliveryMethod[]).map((d) => (
                <button key={d} type="button" role="radio" aria-checked={delivery === d} className="delivery-opt" onClick={() => setDelivery(d)}>
                  <strong>{DELIVERY[d].en}</strong>
                  <span className="small muted">{d === 'PICKUP' && info ? info.pickupAddress : DELIVERY[d].hint}</span>
                  <span className="small">{info ? (info.deliveryFees[d] ? etb(info.deliveryFees[d]) : 'Free') : ''}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label className="field">Full name
              <input className="input" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
            <label className="field">Mobile number
              <input className="input" required inputMode="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="0911 234 567" autoComplete="tel" />
            </label>
            {delivery === 'REGIONAL' ? (
              <label className="field">City
                <input className="input" required maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bahir Dar" />
              </label>
            ) : null}
          </div>
          {delivery !== 'PICKUP' ? (
            <label className="field">Address
              <textarea className="textarea" required maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="Sub-city, woreda, nearby landmark (e.g. Bole, behind Edna Mall)" style={{ minHeight: 70 }} />
            </label>
          ) : null}
          <label className="field">Note for the print team <span className="muted small" style={{ fontWeight: 400 }}>· optional</span>
            <input className="input" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. it's a gift, please call before delivery" />
          </label>

          <div className="order-total">
            {quote ? (
              <>
                <span>{quote.copies} × {etb(quote.unitPrice)}{quote.deliveryFee ? ` + delivery ${etb(quote.deliveryFee)}` : ''}</span>
                <strong>{etb(quote.total)}</strong>
              </>
            ) : <span className="muted">Working out the price…</span>}
          </div>

          <div className="pills" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted small">Pay with telebirr, CBE Birr, M-Pesa, bank or card on Chapa's secure page.</span>
            <div className="pills">
              <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
              <button type="submit" className="btn btn-yellow" disabled={busy || !quote || !!unavailable}>
                {busy ? 'Opening payment…' : quote ? `Pay ${etb(quote.total)}` : 'Pay'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import { useDialog } from "../hooks/useDialog.js";
import GarmentArt from "../components/GarmentArt.jsx";
import { IconClose, IconWhatsApp, IconCopy, IconCheck } from "../components/Icons.jsx";
import { api } from "../api.js";
import { money, formatDate, copyText, paymentSplit } from "../utils/helpers.js";
import { ORDER_STATUSES } from "../utils/validate.js";
import { customerWhatsApp } from "./adminUtils.js";

const label = (id) => ORDER_STATUSES.find((s) => s.id === id)?.label || id;

// Everything about one order — use it to double-check a receipt screenshot
// a customer sends on WhatsApp.
export default function OrderDetail({ orderNumber, guard, onClose, onChanged, onOpenOther }) {
  const ref = useRef(null);
  const titleId = useId();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState("");
  useDialog(ref, onClose);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError("");
    guard(api.admin.order(orderNumber))
      .then((d) => {
        if (!alive) return;
        setData(d);
        setNote(d.order.adminNote);
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [orderNumber, guard]);

  async function save(patch) {
    setSaving(true);
    setError("");
    try {
      const order = await guard(api.admin.updateOrder(orderNumber, patch));
      setData((d) => ({ ...d, order: { ...d.order, ...order, items: d.order.items } }));
      onChanged(order);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function copy(text, what) {
    if (await copyText(text)) {
      setCopied(what);
      setTimeout(() => setCopied(""), 1500);
    }
  }

  const o = data?.order;
  const c = o?.customer;
  const wa = o ? customerWhatsApp(c.phone, `Hi ${c.name}, this is Frost about your order #${o.orderNumber}.`) : "";
  const pieces = o ? o.items.reduce((s, i) => s + i.qty, 0) : 0;

  return createPortal(
    <div className="adm-overlay adm-overlay-side" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-editor adm-order-sheet" ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="adm-editor-head">
          <div>
            <p className="adm-eyebrow">Order</p>
            <h2 id={titleId} className="adm-order-title">
              #{orderNumber}
              <button className="adm-icon-btn" onClick={() => copy(orderNumber, "num")} aria-label="Copy order number">
                {copied === "num" ? <IconCheck size={16} /> : <IconCopy size={16} />}
              </button>
            </h2>
          </div>
          <button className="adm-icon-btn" onClick={onClose} aria-label="Close" data-autofocus>
            <IconClose />
          </button>
        </header>

        <div className="adm-sheet-body">
          {error && (
            <p className="adm-flash is-err" role="alert">
              {error}
            </p>
          )}
          {!o && !error && <p className="adm-muted">Loading order…</p>}

          {o && (
            <>
              <section className="adm-verify">
                <h3>Receipt check</h3>
                <p className="adm-muted">Compare these with the customer's screenshot:</p>
                <dl>
                  <div>
                    <dt>Order number</dt>
                    <dd>#{o.orderNumber}</dd>
                  </div>
                  <div>
                    <dt>Name</dt>
                    <dd>{c.name}</dd>
                  </div>
                  <div>
                    <dt>Pieces</dt>
                    <dd>{pieces}</dd>
                  </div>
                  <div>
                    <dt>Total to collect</dt>
                    <dd className="adm-verify-total">{money(o.total)}</dd>
                  </div>
                </dl>
                {o.status === "new" && (
                  <button className="adm-btn adm-btn-primary" disabled={saving} onClick={() => save({ status: "confirmed" })}>
                    <IconCheck size={16} /> Receipt matches — confirm order
                  </button>
                )}
              </section>

              <div className="adm-grid-2">
                <section className="adm-card-flat">
                  <h3>Customer</h3>
                  <dl className="adm-kv">
                    <div>
                      <dt>Name</dt>
                      <dd>{c.name}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>
                        <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>{c.phone}</a>
                        <button className="adm-icon-btn adm-icon-sm" onClick={() => copy(c.phone, "phone")} aria-label="Copy phone">
                          {copied === "phone" ? <IconCheck size={14} /> : <IconCopy size={14} />}
                        </button>
                      </dd>
                    </div>
                    <div>
                      <dt>Governorate</dt>
                      <dd>{c.governorate}</dd>
                    </div>
                    <div>
                      <dt>City / area</dt>
                      <dd>{c.city}</dd>
                    </div>
                    <div>
                      <dt>Address</dt>
                      <dd>{c.address}</dd>
                    </div>
                    {c.notes && (
                      <div>
                        <dt>Their note</dt>
                        <dd>“{c.notes}”</dd>
                      </div>
                    )}
                  </dl>
                  {wa && (
                    <a className="adm-btn adm-btn-sm adm-btn-wa" href={wa} target="_blank" rel="noopener noreferrer">
                      <IconWhatsApp size={15} /> Message on WhatsApp
                    </a>
                  )}
                </section>

                <section className="adm-card-flat">
                  <h3>Status</h3>
                  <select
                    className={`adm-status-select s-${o.status}`}
                    value={o.status}
                    disabled={saving}
                    onChange={(e) => save({ status: e.target.value })}
                    aria-label="Order status"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ol className="adm-timeline">
                    {o.history
                      .slice()
                      .reverse()
                      .map((h, i) => (
                        <li key={i}>
                          <b className={`s-${h.status}`}>{label(h.status)}</b>
                          <small>{formatDate(h.at)}</small>
                        </li>
                      ))}
                  </ol>
                </section>
              </div>

              <section className="adm-card-flat">
                <h3>
                  Items <span className="adm-muted">· {pieces} pieces · placed {formatDate(o.createdAt)}</span>
                </h3>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Size</th>
                        <th>Colour</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.items.map((i, idx) => (
                        <tr key={idx}>
                          <td>
                            <div className="adm-prod">
                              <span className="adm-thumb">
                                {i.image ? <img src={i.image} alt="" referrerPolicy="no-referrer" /> : <GarmentArt type={i.art || "coat"} color={i.hex || "#a9774f"} />}
                              </span>
                              <span>
                                <b>{i.name}</b>
                                <small>
                                  {i.id}
                                  {!i.inCatalog && " · no longer in catalog"}
                                  {i.inCatalog && i.currentPrice !== i.price && ` · price now ${money(i.currentPrice)}`}
                                </small>
                              </span>
                            </div>
                          </td>
                          <td>{i.size || "One size"}</td>
                          <td>
                            {i.hex && <span className="adm-swatch" style={{ background: i.hex }} />} {i.color || "—"}
                          </td>
                          <td>
                            <b>{i.qty}</b>
                          </td>
                          <td>{money(i.price)}</td>
                          <td>
                            <b>{money(i.price * i.qty)}</b>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <dl className="adm-sum">
                  <div>
                    <dt>Subtotal</dt>
                    <dd>{money(o.subtotal)}</dd>
                  </div>
                  <div>
                    <dt>Delivery</dt>
                    <dd>{o.shipping === 0 ? "Free" : money(o.shipping)}</dd>
                  </div>
                  <div className="adm-sum-total">
                    <dt>Total</dt>
                    <dd>{money(o.total)}</dd>
                  </div>
                  <div>
                    <dt>Half online (to register)</dt>
                    <dd>{money(paymentSplit(o.total).deposit)}</dd>
                  </div>
                  <div>
                    <dt>Cash to collect on delivery</dt>
                    <dd>{money(paymentSplit(o.total).rest)}</dd>
                  </div>
                </dl>
              </section>

              <section className="adm-card-flat">
                <h3>Private note</h3>
                <textarea
                  className="adm-textarea"
                  rows={3}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Only visible to you — e.g. paid deposit, prefers evening delivery"
                />
                <button className="adm-btn adm-btn-sm" disabled={saving || note === o.adminNote} onClick={() => save({ adminNote: note })}>
                  Save note
                </button>
              </section>

              <section className="adm-card-flat">
                <h3>Other orders from this customer</h3>
                {data.customerOrders.length === 0 ? (
                  <p className="adm-muted">This is their first order.</p>
                ) : (
                  <ul className="adm-mini-list">
                    {data.customerOrders.map((x) => (
                      <li key={x.orderNumber}>
                        <button className="adm-link" onClick={() => onOpenOther(x.orderNumber)}>
                          #{x.orderNumber}
                        </button>
                        <small>{formatDate(x.createdAt)}</small>
                        <span className={`adm-status s-${x.status}`}>{label(x.status)}</span>
                        <b>{money(x.total)}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

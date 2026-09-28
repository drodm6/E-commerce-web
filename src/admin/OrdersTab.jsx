import { useMemo, useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";
import { IconSearch, IconWhatsApp } from "../components/Icons.jsx";
import { money, formatDate } from "../utils/helpers.js";
import { ORDER_STATUSES, cleanText } from "../utils/validate.js";
import { decodeOrder } from "../utils/orderCode.js";
import { toCSV, downloadFile, today, customerWhatsApp } from "./adminUtils.js";

const MAX_PASTE = 12000;

export default function OrdersTab({ orders, setOrders, products }) {
  const [paste, setPaste] = useState("");
  const [preview, setPreview] = useState(null);
  const [importError, setImportError] = useState("");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);
  const [confirm, setConfirm] = useState(null);

  function readPaste() {
    setImportError("");
    setPreview(null);
    try {
      const { order } = decodeOrder(paste.slice(0, MAX_PASTE), products);
      if (orders.some((o) => o.orderNumber === order.orderNumber)) {
        setImportError(`Order #${order.orderNumber} is already in your list.`);
        return;
      }
      setPreview(order);
    } catch (e) {
      setImportError(e.message);
    }
  }

  function addPreview() {
    setOrders([...orders, preview]);
    setOpen(preview.orderNumber);
    setPreview(null);
    setPaste("");
  }

  function update(orderNumber, patch) {
    setOrders(orders.map((o) => (o.orderNumber === orderNumber ? { ...o, ...patch } : o)));
  }

  const counts = useMemo(() => {
    const c = { all: orders.length };
    ORDER_STATUSES.forEach((s) => (c[s.id] = orders.filter((o) => o.status === s.id).length));
    return c;
  }, [orders]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => status === "all" || o.status === status)
      .filter((o) => !q || `${o.orderNumber} ${o.customer.name} ${o.customer.phone} ${o.customer.city}`.toLowerCase().includes(q))
      .slice()
      .reverse();
  }, [orders, status, query]);

  function exportCSV() {
    const rows = [["Order", "Date", "Status", "Name", "Phone", "City", "Address", "Items", "Subtotal", "Delivery", "Total", "Note"]];
    orders.forEach((o) =>
      rows.push([
        o.orderNumber,
        o.createdAt,
        o.status,
        o.customer.name,
        o.customer.phone,
        o.customer.city,
        o.customer.address,
        o.items.map((i) => `${i.qty}x ${i.name} [${[i.size, i.color].filter(Boolean).join("/")}]`).join("; "),
        o.subtotal,
        o.shipping,
        o.total,
        o.adminNote,
      ])
    );
    downloadFile(`frost-orders-${today()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
  }

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <div>
          <p className="adm-eyebrow">Sales</p>
          <h1>Orders</h1>
        </div>
        <div className="adm-head-actions">
          <button className="adm-btn adm-btn-ghost" onClick={exportCSV} disabled={!orders.length}>
            Export CSV
          </button>
        </div>
      </header>

      <section className="adm-card adm-import">
        <div className="adm-card-head">
          <h2>
            <IconWhatsApp size={18} /> Import an order from WhatsApp
          </h2>
        </div>
        <p className="adm-muted">
          When a customer sends their receipt, copy their whole WhatsApp message and paste it here. The order code inside is checked
          against your catalog — prices and totals are recalculated, and anything that doesn't match is flagged.
        </p>
        <textarea
          rows={3}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="Paste the customer's WhatsApp message…"
          maxLength={MAX_PASTE}
          spellCheck={false}
          aria-label="WhatsApp message"
        />
        <div className="adm-import-actions">
          <button className="adm-btn adm-btn-primary" onClick={readPaste} disabled={!paste.trim()}>
            Read order
          </button>
          {importError && (
            <p className="adm-error" role="alert">
              {importError}
            </p>
          )}
        </div>

        {preview && (
          <div className="adm-import-preview">
            <OrderDetails order={preview} />
            <div className="adm-import-actions">
              <button className="adm-btn adm-btn-primary" onClick={addPreview}>
                Add order #{preview.orderNumber}
              </button>
              <button className="adm-btn adm-btn-ghost" onClick={() => setPreview(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="adm-status-tabs" role="group" aria-label="Filter by status">
        {[{ id: "all", label: "All" }, ...ORDER_STATUSES].map((s) => (
          <button key={s.id} className={"adm-chip" + (status === s.id ? " is-active" : "")} onClick={() => setStatus(s.id)} aria-pressed={status === s.id}>
            {s.label} <em>{counts[s.id] || 0}</em>
          </button>
        ))}
      </div>

      <div className="adm-filters">
        <label className="adm-search">
          <IconSearch size={17} />
          <input placeholder="Search order #, name, phone, city" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={60} aria-label="Search orders" />
        </label>
      </div>

      <ul className="adm-orders">
        {list.map((o) => {
          const isOpen = open === o.orderNumber;
          const wa = customerWhatsApp(o.customer.phone, `Hi ${o.customer.name}, this is Frost about your order #${o.orderNumber}.`);
          return (
            <li key={o.orderNumber} className={"adm-order" + (isOpen ? " is-open" : "")}>
              <div className="adm-order-row">
                <button className="adm-order-toggle" onClick={() => setOpen(isOpen ? null : o.orderNumber)} aria-expanded={isOpen}>
                  <span className="adm-order-num">
                    #{o.orderNumber}
                    {o.warnings.length > 0 && <span className="adm-warn-dot" title="Has warnings" />}
                  </span>
                  <span className="adm-order-who">
                    {o.customer.name} <small>{o.customer.city} · {formatDate(o.createdAt)}</small>
                  </span>
                  <span className="adm-order-total">{money(o.total)}</span>
                </button>
                <select className={`adm-status-select s-${o.status}`} value={o.status} onChange={(e) => update(o.orderNumber, { status: e.target.value })} aria-label={`Status of order ${o.orderNumber}`}>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={"collapse" + (isOpen ? " is-open" : "")}>
                <div>
                  <div className="adm-order-body">
                    <OrderDetails order={o} />
                    <label className="adm-field">
                      <span>Private note</span>
                      <textarea
                        rows={2}
                        defaultValue={o.adminNote}
                        maxLength={300}
                        onBlur={(e) => update(o.orderNumber, { adminNote: cleanText(e.target.value, 300) })}
                        placeholder="Only visible to you"
                      />
                    </label>
                    <div className="adm-row-actions">
                      {wa && (
                        <a className="adm-btn adm-btn-sm adm-btn-wa" href={wa} target="_blank" rel="noopener noreferrer">
                          <IconWhatsApp size={15} /> Message customer
                        </a>
                      )}
                      <button
                        className="adm-btn adm-btn-sm adm-btn-danger-ghost"
                        onClick={() =>
                          setConfirm({
                            title: `Delete order #${o.orderNumber}?`,
                            message: "This removes it from your list on this device. It can be re-imported from the WhatsApp message.",
                            confirmLabel: "Delete order",
                            danger: true,
                            onConfirm: () => {
                              setOrders(orders.filter((x) => x.orderNumber !== o.orderNumber));
                              setConfirm(null);
                            },
                          })
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
        {list.length === 0 && <li className="adm-empty">{orders.length ? "No orders match." : "No orders yet — import one from WhatsApp above."}</li>}
      </ul>

      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

export function OrderDetails({ order }) {
  const c = order.customer;
  return (
    <div className="adm-order-details">
      {order.warnings.length > 0 && (
        <ul className="adm-warnings" role="alert">
          {order.warnings.map((w, i) => (
            <li key={i}>⚠ {w}</li>
          ))}
        </ul>
      )}
      <div className="adm-grid-2">
        <div>
          <h3>Customer</h3>
          <p>
            <b>{c.name}</b>
            <br />
            {c.phone}
            <br />
            {c.address}, {c.city}{c.governorate ? `, ${c.governorate}` : ""}
            {c.notes && (
              <>
                <br />
                <i>“{c.notes}”</i>
              </>
            )}
          </p>
        </div>
        <div>
          <h3>Items</h3>
          <ul className="adm-items">
            {order.items.map((i, idx) => (
              <li key={idx}>
                <span>
                  {i.qty} × {i.name}
                  <small>{[i.size && `Size ${i.size}`, i.color, i.id].filter(Boolean).join(" · ")}</small>
                </span>
                <span>{money(i.price * i.qty)}</span>
              </li>
            ))}
            <li className="adm-items-total">
              <span>
                Total <small>incl. {order.shipping === 0 ? "free delivery" : `${money(order.shipping)} delivery`}</small>
              </span>
              <span>{money(order.total)}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

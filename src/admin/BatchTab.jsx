import { useMemo, useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";
import { money } from "../utils/helpers.js";
import { api } from "../api.js";
import { STORE } from "../config.js";
import { toCSV, downloadFile, today } from "./adminUtils.js";

export default function BatchTab({ orders, guard, refresh }) {
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirmed = orders.filter((o) => o.status === "confirmed");
  const ordered = orders.filter((o) => o.status === "ordered");
  const shipping = orders.filter((o) => o.status === "shipping");
  const pct = Math.min(100, (confirmed.length / STORE.batchTarget) * 100);

  // Everything you need to buy from the supplier, grouped by item/size/colour.
  const supplierList = useMemo(() => {
    const map = new Map();
    confirmed.forEach((o) =>
      o.items.forEach((i) => {
        const key = `${i.id}|${i.size}|${i.color}`;
        const row = map.get(key) || { id: i.id, name: i.name, size: i.size, color: i.color, qty: 0, value: 0 };
        row.qty += i.qty;
        row.value += i.qty * i.price;
        map.set(key, row);
      })
    );
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name) || a.size.localeCompare(b.size));
  }, [confirmed]);

  const pieces = supplierList.reduce((s, r) => s + r.qty, 0);
  const batchValue = confirmed.reduce((s, o) => s + o.total, 0);

  function move(from, to, label) {
    const n = orders.filter((o) => o.status === from).length;
    setConfirm({
      title: `${label}?`,
      message: `${n} order${n === 1 ? "" : "s"} will be updated.`,
      confirmLabel: label,
      onConfirm: async () => {
        setConfirm(null);
        setBusy(true);
        try {
          for (const o of orders.filter((x) => x.status === from)) {
            await guard(api.admin.updateOrder(o.orderNumber, { status: to }));
          }
        } catch (e) {
          if (e.status !== 401) alert(e.message);
        } finally {
          setBusy(false);
          refresh();
        }
      },
    });
  }

  function exportList() {
    const rows = [["Product ID", "Product", "Size", "Colour", "Quantity"]];
    supplierList.forEach((r) => rows.push([r.id, r.name, r.size || "One size", r.color, r.qty]));
    downloadFile(`frost-supplier-order-${today()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
  }

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <div>
          <p className="adm-eyebrow">Sea shipment</p>
          <h1>Batch &amp; supplier</h1>
        </div>
      </header>

      <section className="adm-card adm-batch-hero">
        <div className="adm-ring" style={{ "--p": pct }} role="img" aria-label={`${confirmed.length} of ${STORE.batchTarget} confirmed orders`}>
          <span>
            <b>{confirmed.length}</b>
            <small>of {STORE.batchTarget}</small>
          </span>
        </div>
        <div>
          <h2>Current batch</h2>
          <p className="adm-muted">
            {confirmed.length >= STORE.batchTarget
              ? "You've reached your target. Place the combined supplier order, then mark these orders as ordered."
              : `Collect ${STORE.batchTarget - confirmed.length} more confirmed orders to reach your target. You can change the target in shared/store.js.`}
          </p>
          <dl className="adm-batch-facts">
            <div>
              <dt>Pieces to buy</dt>
              <dd>{pieces}</dd>
            </div>
            <div>
              <dt>Customer value</dt>
              <dd>{money(batchValue)}</dd>
            </div>
            <div>
              <dt>In transit</dt>
              <dd>{ordered.length + shipping.length} orders</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Supplier shopping list</h2>
          <div className="adm-head-actions">
            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={exportList} disabled={!supplierList.length}>
              Export CSV
            </button>
            <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => move("confirmed", "ordered", "Mark as ordered from supplier")} disabled={!confirmed.length || busy}>
              Mark {confirmed.length} as ordered
            </button>
          </div>
        </div>
        <p className="adm-muted">Totals from every order marked “Confirmed”.</p>
        {supplierList.length === 0 ? (
          <p className="adm-empty">No confirmed orders yet. Confirm orders in the Orders tab once the customer's WhatsApp receipt arrives.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Size</th>
                  <th>Colour</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {supplierList.map((r) => (
                  <tr key={`${r.id}|${r.size}|${r.color}`}>
                    <td>
                      <b>{r.name}</b> <small className="adm-muted">{r.id}</small>
                    </td>
                    <td>{r.size || "One size"}</td>
                    <td>{r.color || "—"}</td>
                    <td>
                      <b>{r.qty}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Shipment progress</h2>
        </div>
        <div className="adm-pipeline">
          <div>
            <b>{ordered.length}</b>
            <span>Ordered from supplier</span>
            <button className="adm-btn adm-btn-sm adm-btn-ghost" disabled={!ordered.length || busy} onClick={() => move("ordered", "shipping", "Mark as shipping")}>
              Shipped →
            </button>
          </div>
          <div>
            <b>{shipping.length}</b>
            <span>Shipping</span>
            <button className="adm-btn adm-btn-sm adm-btn-ghost" disabled={!shipping.length || busy} onClick={() => move("shipping", "arrived", "Mark as arrived")}>
              Arrived →
            </button>
          </div>
          <div>
            <b>{orders.filter((o) => o.status === "arrived").length}</b>
            <span>Arrived — ready to deliver</span>
            <button
              className="adm-btn adm-btn-sm adm-btn-ghost"
              disabled={!orders.some((o) => o.status === "arrived") || busy}
              onClick={() => move("arrived", "delivered", "Mark as delivered")}
            >
              Delivered ✓
            </button>
          </div>
        </div>
      </section>

      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

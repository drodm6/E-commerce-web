import { useEffect, useState } from "react";
import { api } from "../api.js";
import { money, formatDate, isValidWhatsAppNumber } from "../utils/helpers.js";
import { ORDER_STATUSES } from "../utils/validate.js";
import { STORE } from "../config.js";

const statusLabel = (id) => ORDER_STATUSES.find((s) => s.id === id)?.label || id;
const EVENT_LABELS = {
  login_success: "Signed in",
  login_failed: "Failed sign-in",
  login_locked: "Blocked (locked)",
  logout: "Signed out",
  logout_all: "Signed out everywhere",
  product_created: "Product added",
  product_updated: "Product edited",
  product_deleted: "Product deleted",
  order_status: "Order status",
  order_deleted: "Order deleted",
  photo_uploaded: "Photo uploaded",
};

export default function Overview({ products, orders, guard, onGo, openOrder, onSignOutAll }) {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    guard(api.admin.audit())
      .then(setEvents)
      .catch(() => {});
  }, [guard]);

  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5);
  const soldOut = products.filter((p) => p.stock <= 0);
  const active = orders.filter((o) => o.status !== "cancelled");
  const newCount = orders.filter((o) => o.status === "new").length;
  const confirmed = orders.filter((o) => o.status === "confirmed");
  const revenue = active.reduce((s, o) => s + o.total, 0);
  const pct = Math.min(100, (confirmed.length / STORE.batchTarget) * 100);
  const recent = orders.slice(0, 6);
  const failed24h = events.filter((e) => e.event === "login_failed" && Date.now() - new Date(e.at) < 86_400_000).length;

  const checks = [
    { ok: isValidWhatsAppNumber(STORE.whatsappNumber), label: "WhatsApp number set", fix: "Set whatsappNumber in shared/store.js" },
    { ok: window.isSecureContext, label: "Served over HTTPS", fix: "Deploy with HTTPS so sign-in and customer data are encrypted" },
    { ok: true, label: "Password + authenticator (2FA) sign-in" },
    { ok: failed24h < 5, label: "No unusual sign-in attempts", fix: `${failed24h} failed sign-ins in the last 24 h — check the activity log` },
  ];

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <div>
          <p className="adm-eyebrow">Dashboard</p>
          <h1>Good to see you</h1>
        </div>
      </header>

      <div className="adm-stats">
        <Stat label="New orders" value={newCount} sub="waiting for WhatsApp receipt" onClick={() => onGo("orders")} accent={newCount > 0} />
        <Stat label="All orders" value={active.length} sub={`${money(revenue)} to collect`} onClick={() => onGo("orders")} />
        <Stat label="Next batch" value={`${confirmed.length}/${STORE.batchTarget}`} sub="confirmed orders" onClick={() => onGo("batch")} />
        <Stat label="Products" value={products.length} sub={`${lowStock.length} low · ${soldOut.length} sold out`} onClick={() => onGo("products")} />
      </div>

      <div className="adm-cols">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Latest orders</h2>
            <button className="adm-link" onClick={() => onGo("orders")}>
              All orders →
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="adm-muted">No orders yet. They appear here as soon as a customer places one.</p>
          ) : (
            <ul className="adm-mini-list">
              {recent.map((o) => (
                <li key={o.orderNumber}>
                  <span>
                    <button className="adm-link" onClick={() => openOrder(o.orderNumber)}>
                      #{o.orderNumber}
                    </button>{" "}
                    <small>
                      {o.customer.name} · {o.customer.governorate} · {formatDate(o.createdAt)}
                    </small>
                  </span>
                  <span className={`adm-status s-${o.status}`}>{statusLabel(o.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Batch progress</h2>
            <button className="adm-link" onClick={() => onGo("batch")}>
              Open batch →
            </button>
          </div>
          <div className="adm-progress" role="progressbar" aria-valuemin={0} aria-valuemax={STORE.batchTarget} aria-valuenow={confirmed.length}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="adm-muted">
            {confirmed.length >= STORE.batchTarget
              ? "Target reached — time to place the supplier order and ship by sea."
              : `${STORE.batchTarget - confirmed.length} more confirmed orders until your batch target.`}
          </p>
          <div className="adm-card-head">
            <h2>Stock alerts</h2>
          </div>
          {lowStock.length + soldOut.length === 0 ? (
            <p className="adm-muted">Everything is well stocked.</p>
          ) : (
            <ul className="adm-mini-list">
              {[...soldOut, ...lowStock].map((p) => (
                <li key={p.id}>
                  <span>
                    <b>{p.name}</b> <small>{p.id}</small>
                  </span>
                  <span className={"adm-pill " + (p.stock <= 0 ? "is-out" : "is-low")}>{p.stock <= 0 ? "Sold out" : `${p.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="adm-cols">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Security</h2>
          </div>
          <ul className="adm-checks">
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? "ok" : "warn"}>
                <span aria-hidden="true">{c.ok ? "✓" : "!"}</span>
                <div>
                  <b>{c.label}</b>
                  {!c.ok && <small>{c.fix}</small>}
                </div>
              </li>
            ))}
          </ul>
          <button className="adm-btn adm-btn-sm adm-btn-ghost" onClick={onSignOutAll}>
            Sign out on every device
          </button>
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Activity log</h2>
          </div>
          {events.length === 0 ? (
            <p className="adm-muted">No activity yet.</p>
          ) : (
            <ul className="adm-mini-list adm-audit">
              {events.slice(0, 10).map((e, i) => (
                <li key={i} className={e.event === "login_failed" || e.event === "login_locked" ? "is-warn" : ""}>
                  <span>
                    <b>{EVENT_LABELS[e.event] || e.event}</b> <small>{e.detail}</small>
                  </span>
                  <small>
                    {formatDate(e.at)} · {e.ip}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, onClick, accent }) {
  return (
    <button className={"adm-stat" + (accent ? " is-accent" : "")} onClick={onClick}>
      <span className="adm-stat-label">{label}</span>
      <span className="adm-stat-value">{value}</span>
      <span className="adm-stat-sub">{sub}</span>
    </button>
  );
}

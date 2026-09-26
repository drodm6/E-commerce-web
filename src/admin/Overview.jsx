import { money, formatDate, isValidWhatsAppNumber } from "../utils/helpers.js";
import { ORDER_STATUSES } from "../utils/validate.js";
import { STORE } from "../config.js";

const statusLabel = (id) => ORDER_STATUSES.find((s) => s.id === id)?.label || id;

export default function Overview({ products, orders, hasDraft, onGo }) {
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5);
  const soldOut = products.filter((p) => p.stock <= 0);
  const active = orders.filter((o) => o.status !== "cancelled");
  const newCount = orders.filter((o) => o.status === "new").length;
  const confirmed = orders.filter((o) => o.status === "confirmed");
  const revenue = active.reduce((s, o) => s + o.total, 0);
  const pct = Math.min(100, (confirmed.length / STORE.batchTarget) * 100);
  const recent = orders.slice().reverse().slice(0, 5);

  const secure = window.isSecureContext;
  const checks = [
    { ok: isValidWhatsAppNumber(STORE.whatsappNumber), label: "WhatsApp number set", fix: "Set whatsappNumber in src/config.js" },
    { ok: !hasDraft, label: "Catalog published", fix: "You have unpublished product changes — see Products" },
    { ok: secure, label: "Served over HTTPS", fix: "Deploy with HTTPS so passwords and data are encrypted" },
    { ok: true, label: "Admin password is hashed (PBKDF2)" },
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
        <Stat label="Products" value={products.length} sub={`${lowStock.length} low · ${soldOut.length} sold out`} onClick={() => onGo("products")} />
        <Stat label="New orders" value={newCount} sub="waiting for your confirmation" onClick={() => onGo("orders")} accent={newCount > 0} />
        <Stat label="Orders logged" value={active.length} sub={`${money(revenue)} total value`} onClick={() => onGo("orders")} />
        <Stat label="Next batch" value={`${confirmed.length}/${STORE.batchTarget}`} sub="confirmed orders" onClick={() => onGo("batch")} />
      </div>

      <div className="adm-cols">
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
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Store health</h2>
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
        </section>
      </div>

      <div className="adm-cols">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Recent orders</h2>
            <button className="adm-link" onClick={() => onGo("orders")}>
              All orders →
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="adm-muted">No orders logged yet. When a customer sends their receipt on WhatsApp, paste the message into Orders → Import.</p>
          ) : (
            <ul className="adm-mini-list">
              {recent.map((o) => (
                <li key={o.orderNumber}>
                  <span>
                    <b>#{o.orderNumber}</b> <small>{o.customer.name} · {formatDate(o.createdAt)}</small>
                  </span>
                  <span className={`adm-status s-${o.status}`}>{statusLabel(o.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Stock alerts</h2>
            <button className="adm-link" onClick={() => onGo("products")}>
              Products →
            </button>
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

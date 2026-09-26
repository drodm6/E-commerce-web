import { useState, useEffect, useCallback } from "react";
import AdminLogin from "./AdminLogin.jsx";
import Overview from "./Overview.jsx";
import ProductsTab from "./ProductsTab.jsx";
import OrdersTab from "./OrdersTab.jsx";
import BatchTab from "./BatchTab.jsx";
import { IconSnow, IconHanger, IconReceipt, IconShip, IconLock, IconArrowRight } from "../components/Icons.jsx";
import { loadAdminOrders, saveAdminOrders } from "../utils/storage.js";
import { ADMIN } from "../config.js";
import "./admin.css";

const IconGrid = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </svg>
);

const TABS = [
  { id: "overview", label: "Overview", icon: IconGrid },
  { id: "products", label: "Products", icon: IconHanger },
  { id: "orders", label: "Orders", icon: IconReceipt },
  { id: "batch", label: "Batch & supplier", icon: IconShip },
];

export default function AdminPanel(props) {
  const [authed, setAuthed] = useState(false);
  const [notice, setNotice] = useState("");

  const signOut = useCallback((reason) => {
    setNotice(reason || "");
    setAuthed(false);
  }, []);

  // Keep the admin page out of search engines.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  if (!authed) {
    return (
      <AdminLogin
        notice={notice}
        onSuccess={() => {
          setNotice("");
          setAuthed(true);
        }}
      />
    );
  }

  return (
    <AdminShell {...props} onSignOut={signOut} />
  );
}

function AdminShell({ products, hasDraft, setDraft, onSignOut }) {
  const [tab, setTab] = useState("overview");
  const [orders, setOrdersState] = useState(loadAdminOrders);

  const setOrders = useCallback((next) => {
    setOrdersState(next);
    saveAdminOrders(next);
  }, []);

  // Automatic sign-out after inactivity (session timeout).
  useEffect(() => {
    let last = Date.now();
    const bump = () => (last = Date.now());
    const events = ["pointerdown", "keydown", "wheel", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - last > ADMIN.idleMinutes * 60_000) {
        onSignOut(`You were signed out after ${ADMIN.idleMinutes} minutes of inactivity.`);
      }
    }, 15_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(timer);
    };
  }, [onSignOut]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  const counts = {
    products: products.length,
    orders: orders.filter((o) => o.status === "new").length,
    batch: orders.filter((o) => o.status === "confirmed").length,
  };

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand">
          <span className="adm-brand-mark">
            <IconSnow size={16} />
          </span>
          <span>
            FROST <small>Admin</small>
          </span>
        </div>
        <nav className="adm-nav" aria-label="Admin sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={"adm-nav-item" + (tab === id ? " is-active" : "")} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}>
              <Icon size={19} />
              <span>{label}</span>
              {counts[id] > 0 && <em>{counts[id]}</em>}
            </button>
          ))}
        </nav>
        <div className="adm-side-foot">
          <a className="adm-link" href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ""; }}>
            View store <IconArrowRight size={16} />
          </a>
          <button className="adm-btn adm-btn-ghost" onClick={() => onSignOut("You have been signed out.")}>
            <IconLock size={16} /> Sign out
          </button>
          <p className="adm-session-note">Auto sign-out after {ADMIN.idleMinutes} min idle</p>
        </div>
      </aside>

      <main className="adm-main">
        {tab === "overview" && <Overview products={products} orders={orders} hasDraft={hasDraft} onGo={setTab} />}
        {tab === "products" && <ProductsTab products={products} hasDraft={hasDraft} setDraft={setDraft} />}
        {tab === "orders" && <OrdersTab orders={orders} setOrders={setOrders} products={products} />}
        {tab === "batch" && <BatchTab orders={orders} setOrders={setOrders} />}
      </main>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";
import AdminLogin from "./AdminLogin.jsx";
import Overview from "./Overview.jsx";
import ProductsTab from "./ProductsTab.jsx";
import OrdersTab from "./OrdersTab.jsx";
import BatchTab from "./BatchTab.jsx";
import { IconSnow, IconHanger, IconReceipt, IconShip, IconLock, IconArrowRight } from "../components/Icons.jsx";
import { api } from "../api.js";
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
  { id: "orders", label: "Orders", icon: IconReceipt },
  { id: "products", label: "Products", icon: IconHanger },
  { id: "batch", label: "Batch & supplier", icon: IconShip },
];

export default function AdminPanel() {
  const [state, setState] = useState("checking"); // checking | out | in
  const [notice, setNotice] = useState("");

  // Keep the dashboard out of search engines.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    api.admin
      .me()
      .then(() => setState("in"))
      .catch(() => setState("out"));
  }, []);

  const signedOut = useCallback((reason) => {
    setNotice(reason || "");
    setState("out");
  }, []);

  if (state === "checking") return <div className="admin-loading">Loading…</div>;
  if (state === "out") return <AdminLogin notice={notice} onSuccess={() => { setNotice(""); setState("in"); }} />;
  return <AdminShell onSignedOut={signedOut} />;
}

function AdminShell({ onSignedOut }) {
  const [tab, setTab] = useState("overview");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openOrder, setOpenOrder] = useState(null);

  // Any 401 from the API means the session ended (expired / signed out elsewhere).
  const guard = useCallback(
    async (promise) => {
      try {
        return await promise;
      } catch (err) {
        if (err.status === 401) onSignedOut("Your session ended. Please sign in again.");
        throw err;
      }
    },
    [onSignedOut]
  );

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [p, o] = await Promise.all([guard(api.admin.products()), guard(api.admin.orders())]);
      setProducts(p);
      setOrders(o);
    } catch (err) {
      if (err.status !== 401) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [guard]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Idle sign-out in the browser (the server also expires idle sessions).
  const signOut = useCallback(
    async (reason) => {
      try {
        await api.admin.logout();
      } catch {
        /* already gone */
      }
      onSignedOut(reason);
    },
    [onSignedOut]
  );
  const lastActivity = useRef(Date.now());
  useEffect(() => {
    const bump = () => (lastActivity.current = Date.now());
    const events = ["pointerdown", "keydown", "wheel", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - lastActivity.current > ADMIN.idleMinutes * 60_000) {
        signOut(`You were signed out after ${ADMIN.idleMinutes} minutes of inactivity.`);
      }
    }, 20_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(timer);
    };
  }, [signOut]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  const counts = {
    orders: orders.filter((o) => o.status === "new").length,
    products: products.length,
    batch: orders.filter((o) => o.status === "confirmed").length,
  };

  const ctx = { products, orders, refresh, guard, setOrders, setProducts, openOrder: (n) => { setTab("orders"); setOpenOrder(n); } };

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand">
          <span className="adm-brand-mark">
            <IconSnow size={16} />
          </span>
          <span>
            FROST <small>Dashboard</small>
          </span>
        </div>
        <nav className="adm-nav" aria-label="Dashboard sections">
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
          <button className="adm-btn adm-btn-ghost" onClick={() => signOut("You have been signed out.")}>
            <IconLock size={16} /> Sign out
          </button>
          <p className="adm-session-note">Auto sign-out after {ADMIN.idleMinutes} min idle</p>
        </div>
      </aside>

      <main className="adm-main">
        {error && (
          <p className="adm-flash is-err" role="alert">
            {error}
            <button onClick={refresh}>Retry</button>
          </p>
        )}
        {loading ? (
          <div className="adm-page">
            <p className="adm-muted">Loading your shop…</p>
          </div>
        ) : (
          <>
            {tab === "overview" && <Overview {...ctx} onGo={setTab} onSignOutAll={() => guard(api.admin.logoutAll()).then(() => onSignedOut("Signed out on every device."))} />}
            {tab === "orders" && <OrdersTab {...ctx} initialOpen={openOrder} onOpened={() => setOpenOrder(null)} />}
            {tab === "products" && <ProductsTab {...ctx} />}
            {tab === "batch" && <BatchTab {...ctx} />}
          </>
        )}
      </main>
    </div>
  );
}

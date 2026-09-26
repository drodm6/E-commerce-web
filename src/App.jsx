import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import Storefront from "./Storefront.jsx";
import { PUBLISHED_CATALOG } from "./data/catalog.js";
import { loadCatalogDraft, saveCatalogDraft, clearCatalogDraft } from "./utils/storage.js";

// The admin panel is code-split: its code is only downloaded when someone
// visits #admin, so it isn't part of the normal storefront bundle.
const AdminPanel = lazy(() => import("./admin/AdminPanel.jsx"));

const routeFromHash = () => (window.location.hash === "#admin" ? "admin" : "shop");

export default function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [draft, setDraftState] = useState(() => loadCatalogDraft());

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.title = route === "admin" ? "Frost · Admin" : "Frost — Winter Wear, Layered Right";
  }, [route]);

  const setDraft = useCallback((next) => {
    if (next === null) {
      clearCatalogDraft();
      setDraftState(null);
    } else {
      saveCatalogDraft(next);
      setDraftState(next);
    }
  }, []);

  const products = draft ?? PUBLISHED_CATALOG;

  if (route === "admin") {
    return (
      <Suspense fallback={<div className="admin-loading">Loading…</div>}>
        <AdminPanel products={products} hasDraft={draft !== null} setDraft={setDraft} />
      </Suspense>
    );
  }

  return <Storefront products={products} isDraft={draft !== null} />;
}

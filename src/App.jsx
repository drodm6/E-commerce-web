import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import Storefront from "./Storefront.jsx";
import { api } from "./api.js";
import { ADMIN } from "./config.js";

// The admin panel is code-split: its code only downloads when someone opens
// the secret address (#dabo). Real protection is on the server — every admin
// API call requires a signed-in session with password + 2FA.
const AdminPanel = lazy(() => import("./admin/AdminPanel.jsx"));

const routeFromHash = () => (window.location.hash === ADMIN.route ? "admin" : "shop");

export default function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [products, setProducts] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.title = route === "admin" ? "Frost · Dashboard" : "Frost — Winter Wear, Layered Right";
  }, [route]);

  const loadProducts = useCallback(() => {
    setLoadError("");
    api
      .products()
      .then(setProducts)
      .catch((e) => setLoadError(e.message));
  }, []);

  useEffect(() => {
    if (route === "shop") loadProducts();
  }, [route, loadProducts]);

  if (route === "admin") {
    return (
      <Suspense fallback={<div className="admin-loading">Loading…</div>}>
        <AdminPanel />
      </Suspense>
    );
  }

  return <Storefront products={products} loadError={loadError} onRetry={loadProducts} />;
}

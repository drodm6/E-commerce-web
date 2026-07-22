import { useState, useEffect, useMemo, useCallback } from "react";
import Header from "./components/Header.jsx";
import ProductGrid from "./components/ProductGrid.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import ReceiptModal from "./components/ReceiptModal.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import { DEFAULT_PRODUCTS } from "./data/defaultProducts.js";
import { loadProducts, saveProducts, loadOrders, saveOrders, loadCart, saveCart } from "./utils/storage.js";
import { uid } from "./utils/helpers.js";
import "./App.css";

// Admin panel route: not linked anywhere in the UI. Visit yoursite.com/#admin
// to reach it. This is a simple client-side password gate (see
// src/utils/helpers.js -> ADMIN_PASSWORD) — fine for a personal/small
// storefront, but swap in real authentication before handling real customers.

export default function App() {
  const [route, setRoute] = useState(window.location.hash === "#admin" ? "admin" : "shop");
  const [products, setProductsState] = useState(DEFAULT_PRODUCTS);
  const [orders, setOrdersState] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Simple hash-based routing so the admin panel has no visible link.
  useEffect(() => {
    function onHash() {
      setRoute(window.location.hash === "#admin" ? "admin" : "shop");
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Load persisted data once on mount.
  useEffect(() => {
    const storedProducts = loadProducts();
    if (storedProducts && storedProducts.length) {
      setProductsState(storedProducts);
    } else {
      saveProducts(DEFAULT_PRODUCTS);
    }
    setOrdersState(loadOrders());
    setCart(loadCart());
    setLoading(false);
  }, []);

  // Keep cart persisted so it survives a refresh.
  useEffect(() => {
    if (!loading) saveCart(cart);
  }, [cart, loading]);

  const setProducts = useCallback((next) => {
    setProductsState(next);
    saveProducts(next);
  }, []);

  const setOrders = useCallback((next) => {
    setOrdersState(next);
    saveOrders(next);
  }, []);

  function addToCart(product, qty) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === product.id);
      if (existing) {
        return prev.map((c) => (c.id === product.id ? { ...c, qty: Math.min(c.qty + qty, product.stock) } : c));
      }
      return [...prev, { id: product.id, qty }];
    });
    setCartOpen(true);
  }

  function changeQty(id, qty) {
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, qty } : c)));
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((c) => c.id !== id));
  }

  function checkout(items, subtotal, shipping, total) {
    const order = {
      orderNumber: uid("ORD"),
      date: new Date().toLocaleString(),
      items: items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
      subtotal,
      shipping,
      total,
    };
    setOrders([...orders, order]);
    setCart([]);
    setCartOpen(false);
    setReceipt(order);
  }

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  if (route === "admin") {
    return <AdminPanel products={products} setProducts={setProducts} orders={orders} />;
  }

  return (
    <div>
      <Header search={search} onSearchChange={setSearch} cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />

      <div className="hero">
        <h1>Everything you need, dropped at your door.</h1>
        <p>Cash on delivery · Order via receipt confirmation on WhatsApp</p>
      </div>

      <ProductGrid products={filteredProducts} search={search} onAdd={addToCart} loading={loading} />

      <div className="footer-note">Zonlet demo storefront</div>

      {cartOpen && (
        <CartDrawer
          cart={cart}
          products={products}
          onClose={() => setCartOpen(false)}
          onQtyChange={changeQty}
          onRemove={removeFromCart}
          onCheckout={checkout}
        />
      )}

      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

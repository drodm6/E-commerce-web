import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import ShopToolbar from "./components/ShopToolbar.jsx";
import ProductGrid from "./components/ProductGrid.jsx";
import ProductModal from "./components/ProductModal.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import ReceiptModal from "./components/ReceiptModal.jsx";
import MyOrdersModal from "./components/MyOrdersModal.jsx";
import Footer from "./components/Footer.jsx";
import Toast from "./components/Toast.jsx";
import { loadCartRaw, saveCart, loadMyOrders, saveMyOrders } from "./utils/storage.js";
import { sanitizeCart, LIMITS } from "./utils/validate.js";
import { uid, cartKey, computeTotals } from "./utils/helpers.js";
import "./App.css";

export default function Storefront({ products, isDraft }) {
  const [cart, setCart] = useState(() => sanitizeCart(loadCartRaw(), products));
  const [myOrders, setMyOrders] = useState(loadMyOrders);
  const [cartOpen, setCartOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [active, setActive] = useState(null); // { product, rect }
  const [receipt, setReceipt] = useState(null);
  const [toast, setToast] = useState(null);
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  // If the catalog changes (e.g. a product was removed), drop stale cart lines.
  useEffect(() => {
    setCart((prev) => sanitizeCart(prev, products));
  }, [products]);

  const lines = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return cart
      .map((c) => {
        const p = byId.get(c.id);
        return p ? { ...c, key: cartKey(c.id, c.size, c.color), product: p, price: p.price, name: p.name } : null;
      })
      .filter(Boolean);
  }, [cart, products]);

  const cartCount = lines.reduce((s, l) => s + l.qty, 0);

  const addToCart = useCallback((product, { size, color, qty }) => {
    setCart((prev) => {
      const key = cartKey(product.id, size, color);
      const existing = prev.find((c) => cartKey(c.id, c.size, c.color) === key);
      const cap = Math.min(product.stock, LIMITS.maxQty);
      if (existing) {
        return prev.map((c) => (c === existing ? { ...c, qty: Math.min(c.qty + qty, cap) } : c));
      }
      return [...prev, { id: product.id, size, color, qty: Math.min(qty, cap) }];
    });
    setToast({ id: Date.now(), text: `${product.name} added to your bag`, action: "View bag" });
  }, []);

  function changeQty(key, qty) {
    const stockOf = new Map(products.map((p) => [p.id, p.stock]));
    setCart((prev) =>
      prev.map((c) => {
        if (cartKey(c.id, c.size, c.color) !== key) return c;
        const cap = Math.min(stockOf.get(c.id) ?? 1, LIMITS.maxQty);
        return { ...c, qty: Math.max(1, Math.min(qty, cap)) };
      })
    );
  }

  const dismissToast = useCallback(() => setToast(null), []);

  function removeLine(key) {
    setCart((prev) => prev.filter((c) => cartKey(c.id, c.size, c.color) !== key));
  }

  function placeOrder(customer) {
    const items = lines.map((l) => ({ id: l.id, name: l.name, size: l.size, color: l.color, qty: l.qty, price: l.price }));
    const order = {
      orderNumber: uid("FR"),
      createdAt: new Date().toISOString(),
      customer,
      items,
      ...computeTotals(items),
      status: "new",
    };
    const next = [...myOrders, order];
    setMyOrders(next);
    saveMyOrders(next);
    setCart([]);
    setCartOpen(false);
    setReceipt(order);
  }

  const categories = useMemo(() => ["All", ...new Set(products.map((p) => p.category))], [products]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (!q) return true;
      return [p.name, p.category, p.material, ...p.colors.map((c) => c.name)].join(" ").toLowerCase().includes(q);
    });
    list = list.slice();
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "new") list.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    else list.sort((a, b) => Number(b.featured) - Number(a.featured));
    return list;
  }, [products, category, sort, search]);

  function focusSearch() {
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 450);
  }

  return (
    <div className="store">
      <a className="skip-link" href="#shop">
        Skip to products
      </a>

      <Header
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
        onSearch={focusSearch}
        hasOrders={myOrders.length > 0}
        onOrdersOpen={() => setOrdersOpen(true)}
      />

      {isDraft && (
        <div className="draft-banner" role="status">
          Preview: you're seeing unpublished catalog changes saved on this device from the admin panel.
        </div>
      )}

      <main>
        <Hero products={products} />
        <HowItWorks />

        <section id="shop" className="shop" aria-labelledby="shop-title">
          <div className="section-head">
            <p className="eyebrow">Winter collection</p>
            <h2 id="shop-title">The Winter Edit</h2>
            <p className="section-sub">Hand-picked coats, knits and warm layers — tap any piece to see every detail.</p>
          </div>

          <ShopToolbar
            categories={categories}
            category={category}
            onCategory={setCategory}
            sort={sort}
            onSort={setSort}
            search={search}
            onSearch={setSearch}
            count={visible.length}
            searchRef={searchRef}
          />

          <ProductGrid
            products={visible}
            search={search}
            onOpen={(product, rect) => setActive({ product, rect })}
            onReset={() => {
              setSearch("");
              setCategory("All");
            }}
          />
        </section>
      </main>

      <Footer />

      {active && (
        <ProductModal
          key={active.product.id}
          product={active.product}
          originRect={active.rect}
          onClose={() => setActive(null)}
          onAdd={addToCart}
        />
      )}

      {cartOpen && (
        <CartDrawer
          lines={lines}
          onClose={() => setCartOpen(false)}
          onQtyChange={changeQty}
          onRemove={removeLine}
          onPlaceOrder={placeOrder}
        />
      )}

      {ordersOpen && (
        <MyOrdersModal
          orders={myOrders}
          onClose={() => setOrdersOpen(false)}
          onOpenReceipt={(o) => {
            setOrdersOpen(false);
            setReceipt(o);
          }}
        />
      )}

      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}

      <Toast
        toast={toast}
        onAction={() => {
          setToast(null);
          setCartOpen(true);
        }}
        onDone={dismissToast}
      />
    </div>
  );
}

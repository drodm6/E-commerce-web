import { useEffect, useRef, useState } from "react";
import { IconBag, IconSearch, IconReceipt, IconSnow } from "./Icons.jsx";
import "./Header.css";

export default function Header({ cartCount, onCartOpen, onSearch, hasOrders, onOrdersOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const [bump, setBump] = useState(false);
  const prevCount = useRef(cartCount);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Little "bump" on the bag whenever something is added.
  useEffect(() => {
    if (cartCount > prevCount.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 450);
      prevCount.current = cartCount;
      return () => clearTimeout(t);
    }
    prevCount.current = cartCount;
  }, [cartCount]);

  return (
    <header className={"topbar" + (scrolled ? " is-scrolled" : "")}>
      <div className="topbar-inner">
        <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="Frost — back to top">
          <span className="brand-mark" aria-hidden="true">
            <IconSnow size={18} />
          </span>
          <span className="brand-word">FROST</span>
        </a>

        <div className="top-actions">
          <button className="icon-btn" onClick={onSearch} aria-label="Search products">
            <IconSearch />
          </button>
          {hasOrders && (
            <button className="icon-btn" onClick={onOrdersOpen} aria-label="My orders and receipts">
              <IconReceipt />
            </button>
          )}
          <button className={"bag-btn" + (bump ? " bump" : "")} onClick={onCartOpen} aria-label={`Open bag, ${cartCount} item${cartCount === 1 ? "" : "s"}`}>
            <IconBag />
            <span className="bag-label">Bag</span>
            <span className={"bag-count" + (cartCount ? " has" : "")}>{cartCount}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

import { useEffect, useRef, useState } from "react";
import { IconBag, IconSearch, IconReceipt, IconSnow, IconInstagram } from "./Icons.jsx";
import { instagramLink } from "../utils/helpers.js";
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

  const ig = instagramLink();

  return (
    <header className={"topbar" + (scrolled ? " is-scrolled" : "")}>
      <div className="topbar-inner">
        <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="Frost — back to top">
          <span className="brand-mark" aria-hidden="true">
            <IconSnow size={18} />
          </span>
          <span className="brand-word">FROST</span>
        </a>

        <nav className="topnav" aria-label="Main">
          <a href="#shop">Shop</a>
          <a href="#how">How it works</a>
          {ig && (
            <a href={ig} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          )}
        </nav>

        <div className="top-actions">
          <button className="icon-btn" onClick={onSearch} aria-label="Search products">
            <IconSearch />
          </button>
          {ig && (
            <a className="icon-btn hide-sm" href={ig} target="_blank" rel="noopener noreferrer" aria-label="Frost on Instagram">
              <IconInstagram />
            </a>
          )}
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

import "./Header.css";

export default function Header({ search, onSearchChange, cartCount, onCartOpen }) {
  return (
    <div className="topbar">
      <div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        <div>
          <div className="brand-mark">
            zon<span>let</span>
          </div>
          <div className="brand-tag">everything, delivered</div>
        </div>
      </div>

      <div className="search-wrap">
        <input
          className="search-input"
          placeholder="Search products..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <button className="search-btn">🔍</button>
      </div>

      <button className="cart-btn" onClick={onCartOpen}>
        🛒 Cart
        {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
      </button>
    </div>
  );
}

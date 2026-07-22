import { useState } from "react";
import { money } from "../utils/helpers";
import "./ProductCard.css";

function Stars({ rating }) {
  const full = Math.round(rating);
  return (
    <span className="stars">
      {"★".repeat(full)}
      {"☆".repeat(5 - full)}
    </span>
  );
}

export default function ProductCard({ product, onAdd }) {
  const [qty, setQty] = useState(1);
  const outOfStock = product.stock <= 0;
  const maxQty = Math.min(product.stock, 10) || 1;

  return (
    <div className="card">
      <div className="thumb">{product.emoji || "📦"}</div>
      <div className="p-name">{product.name}</div>
      <div className="row">
        <Stars rating={product.rating} />
        <span className="rev-count">{product.reviews}</span>
      </div>
      <div className="price">{money(product.price)}</div>

      {outOfStock ? (
        <div className="stock-out">Out of stock</div>
      ) : (
        <div className="row">
          <select value={qty} onChange={(e) => setQty(Number(e.target.value))}>
            {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      )}

      <button className="btn-yellow" disabled={outOfStock} onClick={() => onAdd(product, qty)}>
        {outOfStock ? "Unavailable" : "Add to Cart"}
      </button>
    </div>
  );
}

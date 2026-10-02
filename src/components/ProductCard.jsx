import { ProductVisual } from "./GarmentArt.jsx";
import { money } from "../utils/helpers.js";
import "./ProductCard.css";

export function stockBadge(p) {
  if (p.stock <= 0) return { label: "Sold out", tone: "out" };
  if (p.stock <= 5) return { label: `Only ${p.stock} left`, tone: "low" };
  return null;
}

export default function ProductCard({ product, index, onOpen }) {
  const stock = stockBadge(product);
  const soldOut = product.stock <= 0;

  return (
    <article className={"p-card" + (soldOut ? " is-out" : "")} style={{ "--i": Math.min(index, 12) }}>
      <button
        type="button"
        className="p-card-hit"
        onClick={(e) => onOpen(product, e.currentTarget.querySelector(".p-media").getBoundingClientRect())}
        aria-label={`${product.name}, ${money(product.price)}. View details`}
      >
        <span className="p-media">
          <ProductVisual product={product} />
          <span className="p-badges">
            {product.isNew && <span className="badge badge-new">New</span>}
            {product.compareAt && <span className="badge badge-sale">Sale</span>}
          </span>
          {product.images.length > 1 && (
            <span className="p-photos" aria-label={`${product.images.length} photos`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="9" cy="11" r="2" />
                <path d="m21 16-5-5-9 8" />
              </svg>
              {product.images.length}
            </span>
          )}
          <span className="p-quick">View details</span>
        </span>

        <span className="p-info">
          <span className="p-cat">{product.category}</span>
          <span className="p-name">{product.name}</span>
          <span className="p-bottom">
            <span className="p-price-row">
              <span className="p-price">
                {money(product.price)}
                {product.compareAt && <s>{money(product.compareAt)}</s>}
              </span>
              {stock && <span className={`p-stock p-stock-${stock.tone}`}>{stock.label}</span>}
            </span>
            {product.colors.length > 0 && (
              <span className="p-swatches" aria-label={`${product.colors.length} colours`}>
                {product.colors.slice(0, 4).map((c) => (
                  <span key={c.name} className="swatch-dot" style={{ background: c.hex }} title={c.name} />
                ))}
              </span>
            )}
          </span>
        </span>
      </button>
    </article>
  );
}

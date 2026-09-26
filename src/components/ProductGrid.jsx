import ProductCard from "./ProductCard.jsx";

export default function ProductGrid({ products, search, onOpen, onReset }) {
  if (products.length === 0) {
    return (
      <div className="empty-state">
        <p>{search ? <>Nothing matches “{search}”.</> : "No pieces in this category yet."}</p>
        <button className="btn btn-outline" onClick={onReset}>
          Show everything
        </button>
      </div>
    );
  }

  return (
    <div className="grid">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} index={i} onOpen={onOpen} />
      ))}
    </div>
  );
}

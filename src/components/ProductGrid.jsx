import ProductCard from "./ProductCard.jsx";

export default function ProductGrid({ products, loading, error, onRetry, search, onOpen, onReset }) {
  if (error) {
    return (
      <div className="empty-state" role="alert">
        <p>{error}</p>
        <button className="btn btn-outline" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid" aria-busy="true" aria-label="Loading products">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="p-skeleton">
            <span className="sk-media" />
            <span className="sk-line" />
            <span className="sk-line short" />
          </div>
        ))}
      </div>
    );
  }

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

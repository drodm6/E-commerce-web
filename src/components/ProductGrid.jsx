import ProductCard from "./ProductCard.jsx";

export default function ProductGrid({ products, search, onAdd, loading }) {
  if (loading) {
    return <p style={{ textAlign: "center", color: "#666", padding: "40px" }}>Loading products…</p>;
  }

  if (products.length === 0) {
    return (
      <div className="grid">
        <p style={{ color: "#666" }}>No products match "{search}".</p>
      </div>
    );
  }

  return (
    <div className="grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onAdd={onAdd} />
      ))}
    </div>
  );
}

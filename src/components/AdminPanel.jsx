import { useState } from "react";
import { uid, money, ADMIN_PASSWORD } from "../utils/helpers";
import "./AdminPanel.css";

const BLANK_FORM = { name: "", price: "", rating: "4.5", reviews: "0", emoji: "📦", stock: "10", desc: "" };

export default function AdminPanel({ products, setProducts, orders }) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [tab, setTab] = useState("products");
  const [form, setForm] = useState(BLANK_FORM);
  const [editingId, setEditingId] = useState(null);

  if (!authed) {
    return (
      <div className="admin-wrap">
        <div className="admin-gate">
          <h2>🔒 Admin Access</h2>
          <input
            type="password"
            placeholder="Admin password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <button
            className="btn-yellow"
            style={{ width: "100%" }}
            onClick={() => {
              if (pw === ADMIN_PASSWORD) setAuthed(true);
              else alert("Incorrect password");
            }}
          >
            Enter
          </button>
          <p style={{ fontSize: "11px", color: "#666", marginTop: "10px" }}>
            This panel is not linked anywhere on the storefront.
          </p>
        </div>
      </div>
    );
  }

  function submitForm() {
    if (!form.name || !form.price) {
      alert("Name and price are required");
      return;
    }
    const record = {
      id: editingId || uid("P"),
      name: form.name,
      price: parseFloat(form.price) || 0,
      rating: parseFloat(form.rating) || 0,
      reviews: parseInt(form.reviews) || 0,
      emoji: form.emoji || "📦",
      stock: parseInt(form.stock) || 0,
      desc: form.desc || "",
    };
    const next = editingId ? products.map((p) => (p.id === editingId ? record : p)) : [...products, record];
    setProducts(next);
    setForm(BLANK_FORM);
    setEditingId(null);
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      price: String(p.price),
      rating: String(p.rating),
      reviews: String(p.reviews),
      emoji: p.emoji,
      stock: String(p.stock),
      desc: p.desc || "",
    });
    setTab("products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteProduct(id) {
    if (confirm("Delete this product?")) {
      setProducts(products.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="admin-wrap">
      <h1 style={{ color: "#fff" }}>Admin Panel</h1>

      <div className="tabs">
        <div className={"tab" + (tab === "products" ? " active" : "")} onClick={() => setTab("products")}>
          Products
        </div>
        <div className={"tab" + (tab === "orders" ? " active" : "")} onClick={() => setTab("orders")}>
          Orders ({orders.length})
        </div>
      </div>

      {tab === "products" && (
        <>
          <div className="admin-form">
            <div>
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label>Price (USD)</label>
              <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label>Rating (0-5)</label>
              <input value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
            </div>
            <div>
              <label>Review Count</label>
              <input value={form.reviews} onChange={(e) => setForm({ ...form, reviews: e.target.value })} />
            </div>
            <div>
              <label>Emoji Icon</label>
              <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
            </div>
            <div>
              <label>Stock</label>
              <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label>Description</label>
              <textarea rows="2" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: "10px", gridColumn: "1/-1" }}>
              <button className="btn-yellow" onClick={submitForm}>
                {editingId ? "Save Changes" : "Add Product"}
              </button>
              {editingId && (
                <button
                  className="btn-outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm(BLANK_FORM);
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Rating</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={{ color: "#888" }}>{p.id}</td>
                  <td>
                    {p.emoji} {p.name}
                  </td>
                  <td>{money(p.price)}</td>
                  <td>{p.stock}</td>
                  <td>
                    {p.rating}★ ({p.reviews})
                  </td>
                  <td style={{ display: "flex", gap: "6px" }}>
                    <button className="btn-outline" onClick={() => startEdit(p)}>
                      Edit
                    </button>
                    <button className="btn-danger" onClick={() => deleteProduct(p.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tab === "orders" && (
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders
              .slice()
              .reverse()
              .map((o) => (
                <tr key={o.orderNumber}>
                  <td style={{ color: "var(--amber)" }}>{o.orderNumber}</td>
                  <td>{o.date}</td>
                  <td>{o.items.map((i) => `${i.qty}x ${i.id}`).join(", ")}</td>
                  <td>{money(o.total)}</td>
                </tr>
              ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan="4" style={{ color: "#666" }}>
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

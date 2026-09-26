import { useMemo, useRef, useState } from "react";
import ProductEditor from "./ProductEditor.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import GarmentArt from "../components/GarmentArt.jsx";
import { IconPlus, IconSearch } from "../components/Icons.jsx";
import { money, uid } from "../utils/helpers.js";
import { CATEGORIES, sanitizeProducts } from "../utils/validate.js";
import { PUBLISHED_CATALOG } from "../data/catalog.js";
import { downloadFile } from "./adminUtils.js";

const MAX_IMPORT_BYTES = 1_000_000;

export default function ProductsTab({ products, hasDraft, setDraft }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [editing, setEditing] = useState(null); // product | "new"
  const [confirm, setConfirm] = useState(null);
  const [message, setMessage] = useState(null);
  const fileRef = useRef(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (cat === "All" || p.category === cat) && (!q || `${p.name} ${p.id}`.toLowerCase().includes(q)));
  }, [products, query, cat]);

  function save(product) {
    const exists = products.some((p) => p.id === product.id);
    setDraft(exists ? products.map((p) => (p.id === product.id ? product : p)) : [...products, product]);
    setEditing(null);
    setMessage({ tone: "ok", text: `Saved “${product.name}”. Remember to publish your changes.` });
  }

  function duplicate(p) {
    setDraft([...products, { ...p, id: uid("P", 6), name: `${p.name} (copy)`.slice(0, 80) }]);
    setMessage({ tone: "ok", text: `Duplicated “${p.name}”.` });
  }

  function askDelete(p) {
    setConfirm({
      title: `Delete “${p.name}”?`,
      message: "It will disappear from the store once you publish. Existing orders keep their copy of the item.",
      confirmLabel: "Delete product",
      danger: true,
      onConfirm: () => {
        setDraft(products.filter((x) => x.id !== p.id));
        setConfirm(null);
      },
    });
  }

  function exportJSON() {
    downloadFile("products.json", JSON.stringify(products, null, 2) + "\n", "application/json");
  }

  async function importJSON(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setMessage({ tone: "err", text: "That file is too large (max 1 MB)." });
      return;
    }
    try {
      const raw = JSON.parse(await file.text());
      const clean = sanitizeProducts(raw);
      if (!clean.length) throw new Error("no valid products");
      const skipped = Array.isArray(raw) ? raw.length - clean.length : 0;
      setConfirm({
        title: `Replace catalog with ${clean.length} products?`,
        message: skipped > 0 ? `${skipped} invalid entries will be skipped.` : "Your current product list will be replaced.",
        confirmLabel: "Import",
        onConfirm: () => {
          setDraft(clean);
          setConfirm(null);
          setMessage({ tone: "ok", text: `Imported ${clean.length} products.` });
        },
      });
    } catch {
      setMessage({ tone: "err", text: "Couldn't read that file. Choose a products.json exported from this panel." });
    }
  }

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <div>
          <p className="adm-eyebrow">Catalog</p>
          <h1>Products</h1>
        </div>
        <div className="adm-head-actions">
          <button className="adm-btn adm-btn-ghost" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importJSON} />
          <button className="adm-btn adm-btn-primary" onClick={() => setEditing("new")}>
            <IconPlus size={16} /> New product
          </button>
        </div>
      </header>

      {hasDraft && (
        <div className="adm-banner">
          <div>
            <b>You have unpublished changes.</b>
            <p>
              They're saved on this device only. To publish for all customers: download <code>products.json</code>, replace{" "}
              <code>src/data/products.json</code> in your project with it, then redeploy.
            </p>
          </div>
          <div className="adm-banner-actions">
            <button className="adm-btn adm-btn-primary" onClick={exportJSON}>
              Download products.json
            </button>
            <button
              className="adm-btn adm-btn-ghost"
              onClick={() =>
                setConfirm({
                  title: "Discard unpublished changes?",
                  message: `This restores the published catalog (${PUBLISHED_CATALOG.length} products).`,
                  confirmLabel: "Discard changes",
                  danger: true,
                  onConfirm: () => {
                    setDraft(null);
                    setConfirm(null);
                  },
                })
              }
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={"adm-flash " + (message.tone === "err" ? "is-err" : "")} role="status">
          {message.text}
          <button onClick={() => setMessage(null)} aria-label="Dismiss">
            ×
          </button>
        </p>
      )}

      <div className="adm-filters">
        <label className="adm-search">
          <IconSearch size={17} />
          <input placeholder="Search name or ID" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={60} aria-label="Search products" />
        </label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
          <option>All</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {!hasDraft && (
          <button className="adm-btn adm-btn-ghost" onClick={exportJSON}>
            Export JSON
          </button>
        )}
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Options</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="adm-prod">
                    <span className="adm-thumb">
                      {p.images[0] ? <img src={p.images[0]} alt="" referrerPolicy="no-referrer" /> : <GarmentArt type={p.art} color={p.colors[0]?.hex || "#a9774f"} />}
                    </span>
                    <span>
                      <b>{p.name}</b>
                      <small>
                        {p.id}
                        {p.isNew && " · New"}
                        {p.featured && " · Featured"}
                      </small>
                    </span>
                  </div>
                </td>
                <td>{p.category}</td>
                <td>
                  {money(p.price)}
                  {p.compareAt && <s className="adm-muted"> {money(p.compareAt)}</s>}
                </td>
                <td>
                  <span className={"adm-pill " + (p.stock <= 0 ? "is-out" : p.stock <= 5 ? "is-low" : "is-ok")}>{p.stock}</span>
                </td>
                <td className="adm-muted">
                  {p.sizes.length ? p.sizes.join(" ") : "One size"}
                  <br />
                  {p.colors.map((c) => c.name).join(", ")}
                </td>
                <td>
                  <div className="adm-row-actions">
                    <button className="adm-btn adm-btn-sm" onClick={() => setEditing(p)}>
                      Edit
                    </button>
                    <button className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => duplicate(p)}>
                      Duplicate
                    </button>
                    <button className="adm-btn adm-btn-sm adm-btn-danger-ghost" onClick={() => askDelete(p)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="adm-empty">
                  No products match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && <ProductEditor product={editing === "new" ? null : editing} onSave={save} onClose={() => setEditing(null)} />}
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

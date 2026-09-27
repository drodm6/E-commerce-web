import { useMemo, useRef, useState } from "react";
import ProductEditor from "./ProductEditor.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import GarmentArt from "../components/GarmentArt.jsx";
import { IconPlus, IconSearch } from "../components/Icons.jsx";
import { api } from "../api.js";
import { money } from "../utils/helpers.js";
import { CATEGORIES, sanitizeProducts } from "../utils/validate.js";
import { downloadFile, today } from "./adminUtils.js";

const MAX_IMPORT_BYTES = 1_000_000;

export default function ProductsTab({ products, setProducts, guard, refresh }) {
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

  const fail = (e) => {
    if (e.status !== 401) setMessage({ tone: "err", text: e.message });
  };

  // Called by the editor. Throws ApiError so the editor can show field errors.
  async function save(fields, id) {
    const product = id ? await guard(api.admin.updateProduct(id, fields)) : await guard(api.admin.createProduct(fields));
    setProducts((prev) => (id ? prev.map((p) => (p.id === id ? product : p)) : [...prev, product]));
    setEditing(null);
    setMessage({ tone: "ok", text: `Saved “${product.name}” — it's live on the store now.` });
  }

  async function duplicate(p) {
    try {
      const { id, ...fields } = p;
      const copy = await guard(api.admin.createProduct({ ...fields, name: `${p.name} (copy)`.slice(0, 80) }));
      setProducts((prev) => [...prev, copy]);
      setMessage({ tone: "ok", text: `Duplicated “${p.name}”.` });
    } catch (e) {
      fail(e);
    }
  }

  function askDelete(p) {
    setConfirm({
      title: `Delete “${p.name}”?`,
      message: "It disappears from the store immediately. Existing orders keep their copy of the item.",
      confirmLabel: "Delete product",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await guard(api.admin.deleteProduct(p.id));
          setProducts((prev) => prev.filter((x) => x.id !== p.id));
        } catch (e) {
          fail(e);
        }
      },
    });
  }

  function exportJSON() {
    downloadFile(`frost-products-${today()}.json`, JSON.stringify(products, null, 2) + "\n", "application/json");
  }

  async function importJSON(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) return setMessage({ tone: "err", text: "That file is too large (max 1 MB)." });
    let clean;
    try {
      clean = sanitizeProducts(JSON.parse(await file.text()));
      if (!clean.length) throw new Error();
    } catch {
      return setMessage({ tone: "err", text: "Couldn't read that file. Choose a products JSON exported from this panel." });
    }
    setConfirm({
      title: `Add ${clean.length} products from this file?`,
      message: "They'll be added as new products (your existing products stay).",
      confirmLabel: "Import",
      onConfirm: async () => {
        setConfirm(null);
        let ok = 0;
        for (const { id, ...fields } of clean) {
          try {
            await guard(api.admin.createProduct(fields));
            ok++;
          } catch (err) {
            if (err.status === 401) return;
          }
        }
        await refresh();
        setMessage({ tone: "ok", text: `Imported ${ok} of ${clean.length} products.` });
      },
    });
  }

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <div>
          <p className="adm-eyebrow">Catalog</p>
          <h1>Products</h1>
        </div>
        <div className="adm-head-actions">
          <button className="adm-btn adm-btn-ghost" onClick={exportJSON}>
            Back up (JSON)
          </button>
          <button className="adm-btn adm-btn-ghost" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importJSON} />
          <button className="adm-btn adm-btn-primary" onClick={() => setEditing("new")}>
            <IconPlus size={16} /> New product
          </button>
        </div>
      </header>

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

import { useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import { useDialog } from "../hooks/useDialog.js";
import GarmentArt, { ProductVisual } from "../components/GarmentArt.jsx";
import { IconClose, IconPlus, IconTrash } from "../components/Icons.jsx";
import { money } from "../utils/helpers.js";
import { CATEGORIES, ART_TYPES, DEFAULT_ART, LIMITS, sanitizeProduct, safeImageUrl, toNumber, cleanText } from "../utils/validate.js";

const SIZE_PRESETS = {
  "S–XL": "S, M, L, XL",
  "S–XXL": "S, M, L, XL, XXL",
  "EU 36–41": "36, 37, 38, 39, 40, 41",
  "One size": "",
};

function toForm(p) {
  if (!p) {
    return {
      name: "",
      category: "Coats",
      art: "coat",
      price: "",
      compareAt: "",
      stock: "10",
      sizes: "S, M, L, XL",
      colors: [{ name: "Camel", hex: "#b5835a" }],
      images: "",
      desc: "",
      material: "",
      fit: "",
      care: "",
      isNew: true,
      featured: false,
    };
  }
  return {
    ...p,
    price: String(p.price),
    compareAt: p.compareAt ? String(p.compareAt) : "",
    stock: String(p.stock),
    sizes: p.sizes.join(", "),
    colors: p.colors.map((c) => ({ ...c })),
    images: p.images.join("\n"),
  };
}

export default function ProductEditor({ product, onSave, onClose }) {
  const ref = useRef(null);
  const titleId = useId();
  const [form, setForm] = useState(() => toForm(product));
  const [errors, setErrors] = useState({});
  useDialog(ref, onClose);

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const imageLines = form.images.split("\n").map((s) => s.trim()).filter(Boolean);
  const badImages = imageLines.filter((s) => !safeImageUrl(s));

  function build() {
    return {
      id: product?.id || "P-NEW",
      name: form.name,
      category: form.category,
      art: form.art,
      price: form.price,
      compareAt: form.compareAt || null,
      stock: form.stock || 0,
      sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      colors: form.colors,
      images: imageLines,
      desc: form.desc,
      material: form.material,
      fit: form.fit,
      care: form.care,
      isNew: form.isNew,
      featured: form.featured,
    };
  }

  function validate() {
    const e = {};
    if (cleanText(form.name, LIMITS.name).length < 2) e.name = "Enter a product name.";
    const price = toNumber(form.price, { min: 0, max: LIMITS.maxPrice });
    if (price === null) e.price = `Enter a price between 0 and ${LIMITS.maxPrice}.`;
    if (form.compareAt) {
      const c = toNumber(form.compareAt, { min: 0, max: LIMITS.maxPrice });
      if (c === null || (price !== null && c <= price)) e.compareAt = "Must be higher than the price (or leave empty).";
    }
    if (toNumber(form.stock || 0, { min: 0, max: LIMITS.maxStock, integer: true }) === null) e.stock = "Whole number, 0 or more.";
    if (badImages.length) e.images = "Only https:// links or /paths are allowed.";
    if (form.colors.some((c) => !cleanText(c.name, LIMITS.colorName))) e.colors = "Every colour needs a name.";
    return e;
  }

  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  async function submit(ev) {
    ev.preventDefault();
    if (saving) return;
    const e = validate();
    setErrors(e);
    setServerError("");
    if (Object.keys(e).length) {
      ref.current?.querySelector(".has-error input, .has-error textarea")?.focus();
      return;
    }
    const clean = sanitizeProduct(build());
    if (!clean) {
      setErrors({ name: "Some values are invalid — please check the form." });
      return;
    }
    const { id, ...fields } = clean;
    setSaving(true);
    try {
      await onSave(fields, product?.id); // the server validates again and assigns the ID
    } catch (err) {
      setServerError(err.message);
      if (err.fields) setErrors(err.fields);
      setSaving(false);
    }
  }

  const preview = sanitizeProduct({ ...build(), name: form.name || "Product name", price: toNumber(form.price, { min: 0, max: LIMITS.maxPrice }) ?? 0 });

  const Field = ({ k, label, hint, children }) => (
    <label className={"adm-field" + (errors[k] ? " has-error" : "")}>
      <span>{label}</span>
      {children}
      {errors[k] ? <em className="adm-field-error">{errors[k]}</em> : hint && <small>{hint}</small>}
    </label>
  );

  return createPortal(
    <div className="adm-overlay adm-overlay-side" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="adm-editor" ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onSubmit={submit} noValidate>
        <header className="adm-editor-head">
          <h2 id={titleId}>{product ? "Edit product" : "New product"}</h2>
          <button type="button" className="adm-icon-btn" onClick={onClose} aria-label="Close editor">
            <IconClose />
          </button>
        </header>

        <div className="adm-editor-body">
          <div className="adm-editor-form">
            <fieldset>
              <legend>Basics</legend>
              {Field({ k: "name", label: "Name", children: <input value={form.name} onChange={set("name")} maxLength={LIMITS.name} data-autofocus /> })}
              <div className="adm-grid-2">
                {Field({
                  k: "category",
                  label: "Category",
                  children: (
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, art: DEFAULT_ART[e.target.value] }))}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  ),
                })}
                {Field({
                  k: "art",
                  label: "Illustration",
                  hint: "Shown when there's no photo",
                  children: (
                    <select value={form.art} onChange={set("art")}>
                      {ART_TYPES.map((a) => (
                        <option key={a} value={a}>
                          {a[0].toUpperCase() + a.slice(1)}
                        </option>
                      ))}
                    </select>
                  ),
                })}
              </div>
              <div className="adm-grid-3">
                {Field({ k: "price", label: "Price", children: <input inputMode="decimal" value={form.price} onChange={set("price")} maxLength={10} /> })}
                {Field({ k: "compareAt", label: "Was price", hint: "Optional, shows a sale", children: <input inputMode="decimal" value={form.compareAt} onChange={set("compareAt")} maxLength={10} /> })}
                {Field({ k: "stock", label: "Stock", children: <input inputMode="numeric" value={form.stock} onChange={set("stock")} maxLength={6} /> })}
              </div>
              <div className="adm-checks-row">
                <label className="adm-check">
                  <input type="checkbox" checked={form.isNew} onChange={set("isNew")} /> Mark as New
                </label>
                <label className="adm-check">
                  <input type="checkbox" checked={form.featured} onChange={set("featured")} /> Featured
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Sizes &amp; colours</legend>
              {Field({
                k: "sizes",
                label: "Sizes",
                hint: "Comma separated. Leave empty for one size.",
                children: <input value={form.sizes} onChange={set("sizes")} maxLength={120} />,
              })}
              <div className="adm-presets">
                {Object.entries(SIZE_PRESETS).map(([label, value]) => (
                  <button key={label} type="button" className="adm-chip" onClick={() => setForm((f) => ({ ...f, sizes: value }))}>
                    {label}
                  </button>
                ))}
              </div>

              <div className={"adm-field" + (errors.colors ? " has-error" : "")}>
                <span>Colours</span>
                <div className="adm-colors">
                  {form.colors.map((c, i) => (
                    <div className="adm-color-row" key={i}>
                      <input
                        type="color"
                        value={c.hex}
                        onChange={(e) => setForm((f) => ({ ...f, colors: f.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)) }))}
                        aria-label={`Colour ${i + 1} swatch`}
                      />
                      <input
                        value={c.name}
                        placeholder="Colour name"
                        maxLength={LIMITS.colorName}
                        onChange={(e) => setForm((f) => ({ ...f, colors: f.colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))}
                        aria-label={`Colour ${i + 1} name`}
                      />
                      <button type="button" className="adm-icon-btn" onClick={() => setForm((f) => ({ ...f, colors: f.colors.filter((_, j) => j !== i) }))} aria-label={`Remove colour ${i + 1}`}>
                        <IconTrash size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                {form.colors.length < LIMITS.maxColors && (
                  <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => setForm((f) => ({ ...f, colors: [...f.colors, { name: "", hex: "#7b5539" }] }))}>
                    <IconPlus size={14} /> Add colour
                  </button>
                )}
                {errors.colors && <em className="adm-field-error">{errors.colors}</em>}
              </div>
            </fieldset>

            <fieldset>
              <legend>Photos &amp; details</legend>
              {Field({
                k: "images",
                label: "Photo links",
                hint: "One per line. Use https:// links, or or put photos in the public/products folder and write /products/name.jpg",
                children: <textarea rows={3} value={form.images} onChange={set("images")} maxLength={3000} spellCheck={false} />,
              })}
              {badImages.length > 0 && <p className="adm-field-error">Not allowed: {badImages.slice(0, 3).join(", ")}</p>}
              {Field({ k: "desc", label: "Description", children: <textarea rows={4} value={form.desc} onChange={set("desc")} maxLength={LIMITS.desc} /> })}
              {Field({ k: "material", label: "Material", children: <input value={form.material} onChange={set("material")} maxLength={LIMITS.detail} /> })}
              <div className="adm-grid-2">
                {Field({ k: "fit", label: "Fit", hint: "e.g. Runs small, size up", children: <input value={form.fit} onChange={set("fit")} maxLength={LIMITS.detail} /> })}
                {Field({ k: "care", label: "Care", children: <input value={form.care} onChange={set("care")} maxLength={LIMITS.detail} /> })}
              </div>
            </fieldset>
          </div>

          <aside className="adm-preview" aria-label="Live preview">
            <p className="adm-eyebrow">Live preview</p>
            {preview ? (
              <div className="adm-preview-card">
                <div className="adm-preview-media">
                  {preview.images.length ? <ProductVisual product={preview} /> : <GarmentArt type={preview.art} color={preview.colors[0]?.hex || "#a9774f"} />}
                </div>
                <p className="adm-preview-cat">{preview.category}</p>
                <p className="adm-preview-name">{preview.name}</p>
                <p className="adm-preview-price">
                  {money(preview.price)} {preview.compareAt && <s>{money(preview.compareAt)}</s>}
                </p>
                <div className="adm-preview-sw">
                  {preview.colors.map((c) => (
                    <span key={c.name} style={{ background: c.hex }} title={c.name} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="adm-muted">Fill in name and price to see a preview.</p>
            )}
          </aside>
        </div>

        <footer className="adm-editor-foot">
          <button type="button" className="adm-btn adm-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          {serverError && <span className="adm-error adm-foot-error">{serverError}</span>}
          <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
            {saving ? "Saving…" : product ? "Save changes" : "Add product"}
          </button>
        </footer>
      </form>
    </div>,
    document.body
  );
}

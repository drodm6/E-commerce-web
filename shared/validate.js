// Input validation & sanitisation — shared by the website and the server.
//
// Everything that crosses a trust boundary goes through these functions:
// checkout input, admin input, API request bodies and anything read back
// from browser storage. Invalid data is rejected or clamped, never trusted
// (OWASP A03 Injection / A04 Insecure design / A08 Data integrity).
// The server always re-validates — browser-side checks are only for UX.

import { round2 } from "./pricing.js";
import { GOVERNORATES } from "./store.js";

export const CATEGORIES = ["Coats", "Jackets", "Knitwear", "Hoodies", "Trousers", "Accessories", "Footwear"];

export const ART_TYPES = ["coat", "puffer", "sweater", "hoodie", "trousers", "scarf", "beanie", "gloves", "boots"];

export const DEFAULT_ART = {
  Coats: "coat",
  Jackets: "puffer",
  Knitwear: "sweater",
  Hoodies: "hoodie",
  Trousers: "trousers",
  Accessories: "scarf",
  Footwear: "boots",
};

export const ORDER_STATUSES = [
  { id: "new", label: "New" },
  { id: "confirmed", label: "Confirmed" },
  { id: "ordered", label: "Ordered from supplier" },
  { id: "shipping", label: "Shipping by sea" },
  { id: "arrived", label: "Arrived" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];
const STATUS_IDS = ORDER_STATUSES.map((s) => s.id);

export const LIMITS = {
  name: 80,
  desc: 600,
  detail: 160,
  size: 10,
  colorName: 20,
  maxSizes: 12,
  maxColors: 10,
  maxImages: 6,
  maxPrice: 100000,
  maxStock: 10000,
  maxQty: 20,
  maxOrderLines: 40,
};

// Control chars, zero-width chars and bidi overrides (used for spoofing).
const UNSAFE_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export function cleanText(value, max) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(UNSAFE_CHARS, "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function cleanMultiline(value, max) {
  if (typeof value !== "string") return "";
  return value
    .replace(UNSAFE_CHARS, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

export function toNumber(value, { min, max, integer = false }) {
  if (value === "" || value === null || value === undefined || typeof value === "boolean") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  if (integer && !Number.isInteger(n)) return null;
  return integer ? n : round2(n);
}

// Only https:// URLs or site-relative paths ("/products/coat.jpg").
// Blocks javascript:, data:, http:, protocol-relative "//evil" and
// credentials-in-URL tricks.
export function safeImageUrl(value) {
  const s = cleanText(value, 500);
  if (!s) return null;
  if (s.startsWith("/")) {
    return !s.startsWith("//") && /^\/[A-Za-z0-9._~\-/%]+$/.test(s) && !s.includes("..") ? s : null;
  }
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    return u.href;
  } catch {
    return null;
  }
}

export function safeHex(value) {
  const s = cleanText(value, 7);
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : null;
}

const PRODUCT_ID = /^P-[A-Z0-9]{3,12}$/;
const ORDER_ID = /^FR-[A-Z0-9]{6,12}$/;

export function isProductId(id) {
  return typeof id === "string" && PRODUCT_ID.test(id);
}

export function isOrderNumber(id) {
  return typeof id === "string" && ORDER_ID.test(id);
}

function uniqueBy(arr, keyFn) {
  const seen = new Set();
  return arr.filter((x) => {
    const k = keyFn(x).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function sanitizeSizes(list) {
  if (!Array.isArray(list)) return [];
  return uniqueBy(list.map((s) => cleanText(s, LIMITS.size)).filter(Boolean), (s) => s).slice(0, LIMITS.maxSizes);
}

export function sanitizeColors(list) {
  if (!Array.isArray(list)) return [];
  const out = list
    .map((c) => {
      const name = cleanText(c && c.name, LIMITS.colorName);
      const hex = safeHex(c && c.hex);
      return name && hex ? { name, hex } : null;
    })
    .filter(Boolean);
  return uniqueBy(out, (c) => c.name).slice(0, LIMITS.maxColors);
}

// Returns a clean product, or null if the record is unusable.
export function sanitizeProduct(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = cleanText(raw.name, LIMITS.name);
  const price = toNumber(raw.price, { min: 0, max: LIMITS.maxPrice });
  if (!isProductId(id) || !name || price === null) return null;

  const category = CATEGORIES.includes(raw.category) ? raw.category : "Accessories";
  const compareAt = toNumber(raw.compareAt, { min: 0, max: LIMITS.maxPrice });

  return {
    id,
    name,
    category,
    art: ART_TYPES.includes(raw.art) ? raw.art : DEFAULT_ART[category],
    price,
    compareAt: compareAt !== null && compareAt > price ? compareAt : null,
    stock: toNumber(raw.stock, { min: 0, max: LIMITS.maxStock, integer: true }) ?? 0,
    sizes: sanitizeSizes(raw.sizes),
    colors: sanitizeColors(raw.colors),
    images: Array.isArray(raw.images) ? raw.images.map(safeImageUrl).filter(Boolean).slice(0, LIMITS.maxImages) : [],
    desc: cleanMultiline(raw.desc, LIMITS.desc),
    material: cleanText(raw.material, LIMITS.detail),
    fit: cleanText(raw.fit, LIMITS.detail),
    care: cleanText(raw.care, LIMITS.detail),
    isNew: raw.isNew === true,
    featured: raw.featured === true,
  };
}

export function sanitizeProducts(list) {
  if (!Array.isArray(list)) return [];
  return uniqueBy(list.map(sanitizeProduct).filter(Boolean), (p) => p.id).slice(0, 500);
}

export function sanitizeCart(list, products) {
  if (!Array.isArray(list)) return [];
  const byId = new Map(products.map((p) => [p.id, p]));
  return list
    .map((c) => {
      const p = c && byId.get(c.id);
      if (!p || p.stock <= 0) return null;
      const qty = toNumber(c.qty, { min: 1, max: LIMITS.maxQty, integer: true });
      const size = cleanText(c.size, LIMITS.size);
      const color = cleanText(c.color, LIMITS.colorName);
      if (!qty) return null;
      if (p.sizes.length && !p.sizes.includes(size)) return null;
      if (p.colors.length && !p.colors.some((x) => x.name === color)) return null;
      return { id: p.id, qty: Math.min(qty, p.stock), size, color };
    })
    .filter(Boolean)
    .slice(0, LIMITS.maxOrderLines);
}

// ── Customer delivery details (checkout form) ──────────────────

export const CUSTOMER_FIELDS = {
  name: { max: 60, min: 2 },
  phone: { max: 20, min: 7 },
  governorate: { max: 30, min: 2 },
  city: { max: 40, min: 2 },
  address: { max: 160, min: 5 },
  notes: { max: 200, min: 0 },
};

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export function validateCustomer(raw) {
  const r = isObject(raw) ? raw : {};
  const value = {};
  for (const [k, spec] of Object.entries(CUSTOMER_FIELDS)) value[k] = cleanText(r[k], spec.max);

  const errors = {};
  if (value.name.length < 2) errors.name = "Please enter your full name.";
  if (!/^\+?[0-9][0-9\s-]{6,18}$/.test(value.phone)) errors.phone = "Enter a valid phone number (digits only).";
  if (!GOVERNORATES.includes(value.governorate)) errors.governorate = "Please choose your governorate.";
  if (value.city.length < 2) errors.city = "Please enter your city or area.";
  if (value.address.length < 5) errors.address = "Please enter a delivery address or nearest landmark.";
  return { value, errors, ok: Object.keys(errors).length === 0 };
}

// ── Order placement (request body of POST /api/orders) ─────────
// Only product IDs, options and quantities are accepted. Prices, names and
// totals are always looked up / computed by the server.

export function validateOrderInput(raw) {
  if (!isObject(raw)) return { ok: false, errors: { form: "Invalid order." } };
  const customer = validateCustomer(raw.customer);
  const errors = { ...customer.errors };

  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  if (rawItems.length === 0 || rawItems.length > LIMITS.maxOrderLines) {
    errors.items = "Your bag is empty or has too many lines.";
  }
  const merged = new Map();
  for (const it of rawItems.slice(0, LIMITS.maxOrderLines)) {
    const qty = toNumber(it && it.qty, { min: 1, max: LIMITS.maxQty, integer: true });
    if (!isObject(it) || !isProductId(it.id) || !qty) {
      errors.items = "Some items in your bag are invalid.";
      continue;
    }
    const line = { id: it.id, size: cleanText(it.size, LIMITS.size), color: cleanText(it.color, LIMITS.colorName), qty };
    const key = `${line.id}|${line.size}|${line.color}`;
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, qty: Math.min(prev.qty + qty, LIMITS.maxQty) } : line);
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { customer: customer.value, items: [...merged.values()] },
  };
}

// ── Admin: product create / update ─────────────────────────────

export function validateProductInput(raw) {
  if (!isObject(raw)) return { ok: false, errors: { form: "Invalid product." } };
  const errors = {};
  if (cleanText(raw.name, LIMITS.name).length < 2) errors.name = "Enter a product name.";
  const price = toNumber(raw.price, { min: 0, max: LIMITS.maxPrice });
  if (price === null) errors.price = `Price must be between 0 and ${LIMITS.maxPrice}.`;
  if (raw.compareAt !== null && raw.compareAt !== undefined && raw.compareAt !== "") {
    const c = toNumber(raw.compareAt, { min: 0, max: LIMITS.maxPrice });
    if (c === null || (price !== null && c <= price)) errors.compareAt = "Was-price must be higher than the price.";
  }
  if (toNumber(raw.stock ?? 0, { min: 0, max: LIMITS.maxStock, integer: true }) === null) errors.stock = "Stock must be a whole number, 0 or more.";
  if (raw.category !== undefined && !CATEGORIES.includes(raw.category)) errors.category = "Unknown category.";
  const images = Array.isArray(raw.images) ? raw.images : [];
  if (images.length > LIMITS.maxImages) errors.images = `At most ${LIMITS.maxImages} photos.`;
  else if (images.some((u) => !safeImageUrl(u))) errors.images = "Photo links must start with https:// (or be a /path on this site).";
  const colors = Array.isArray(raw.colors) ? raw.colors : [];
  if (colors.some((c) => !isObject(c) || !cleanText(c.name, LIMITS.colorName) || !safeHex(c.hex))) errors.colors = "Every colour needs a name and a valid colour.";
  if (Object.keys(errors).length) return { ok: false, errors };

  // Placeholder id: the real id comes from the URL or is generated by the server.
  const { id: _ignored, ...value } = sanitizeProduct({ ...raw, id: "P-000" });
  return { ok: true, errors: {}, value };
}

// ── Orders ─────────────────────────────────────────────────────

export const STATUS_IDS_LIST = STATUS_IDS;

export function validateOrderUpdate(raw) {
  if (!isObject(raw)) return { ok: false, errors: { form: "Invalid update." } };
  const value = {};
  const errors = {};
  if (raw.status !== undefined) {
    if (STATUS_IDS.includes(raw.status)) value.status = raw.status;
    else errors.status = "Unknown status.";
  }
  if (raw.adminNote !== undefined) value.adminNote = cleanMultiline(String(raw.adminNote ?? ""), 500);
  if (!Object.keys(value).length && !Object.keys(errors).length) errors.form = "Nothing to update.";
  return { ok: Object.keys(errors).length === 0, errors, value };
}

const ACCESS_TOKEN = /^[A-Za-z0-9_-]{20,100}$/;
export const isAccessToken = (t) => typeof t === "string" && ACCESS_TOKEN.test(t);

// Customer-side copy of an order kept in browser storage ("Your receipts").
export function sanitizeOrder(raw) {
  if (!isObject(raw) || !isOrderNumber(raw.orderNumber)) return null;
  const created = new Date(raw.createdAt);
  if (Number.isNaN(created.getTime())) return null;

  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map((i) => {
      if (!isObject(i) || !isProductId(i.id)) return null;
      const qty = toNumber(i.qty, { min: 1, max: LIMITS.maxQty, integer: true });
      const price = toNumber(i.price, { min: 0, max: LIMITS.maxPrice });
      if (!qty || price === null) return null;
      return {
        id: i.id,
        name: cleanText(i.name, LIMITS.name) || i.id,
        size: cleanText(i.size, LIMITS.size),
        color: cleanText(i.color, LIMITS.colorName),
        qty,
        price,
      };
    })
    .filter(Boolean)
    .slice(0, LIMITS.maxOrderLines);
  if (!items.length) return null;

  const c = isObject(raw.customer) ? raw.customer : {};
  const customer = {};
  for (const [k, spec] of Object.entries(CUSTOMER_FIELDS)) customer[k] = cleanText(c[k], spec.max);
  const money = (v) => toNumber(v, { min: 0, max: LIMITS.maxPrice * LIMITS.maxOrderLines }) ?? 0;

  return {
    orderNumber: raw.orderNumber,
    createdAt: created.toISOString(),
    customer,
    items,
    subtotal: money(raw.subtotal),
    shipping: money(raw.shipping),
    total: money(raw.total),
    status: STATUS_IDS.includes(raw.status) ? raw.status : "new",
    accessToken: isAccessToken(raw.accessToken) ? raw.accessToken : "",
  };
}

export function sanitizeOrders(list) {
  if (!Array.isArray(list)) return [];
  return uniqueBy(list.map(sanitizeOrder).filter(Boolean), (o) => o.orderNumber).slice(-200);
}

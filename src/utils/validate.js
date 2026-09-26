// Input validation & sanitisation.
//
// Every piece of data that crosses a trust boundary — admin form input,
// customer checkout input, anything read back from localStorage, imported
// JSON files, and order codes pasted from WhatsApp — goes through these
// functions. Invalid data is rejected or clamped, never trusted as-is
// (OWASP A03 Injection / A08 Data Integrity).

import { round2 } from "./helpers.js";

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
const UNSAFE_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;

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
  city: { max: 40, min: 2 },
  address: { max: 160, min: 5 },
  notes: { max: 200, min: 0 },
};

export function validateCustomer(raw) {
  const value = {
    name: cleanText(raw.name, CUSTOMER_FIELDS.name.max),
    phone: cleanText(raw.phone, CUSTOMER_FIELDS.phone.max),
    city: cleanText(raw.city, CUSTOMER_FIELDS.city.max),
    address: cleanText(raw.address, CUSTOMER_FIELDS.address.max),
    notes: cleanText(raw.notes, CUSTOMER_FIELDS.notes.max),
  };
  const errors = {};
  if (value.name.length < 2) errors.name = "Please enter your full name.";
  if (!/^\+?[0-9][0-9\s-]{6,18}$/.test(value.phone)) errors.phone = "Enter a valid phone number (digits only).";
  if (value.city.length < 2) errors.city = "Please enter your city.";
  if (value.address.length < 5) errors.address = "Please enter a delivery address or nearest landmark.";
  return { value, errors, ok: Object.keys(errors).length === 0 };
}

// ── Orders ─────────────────────────────────────────────────────

export function sanitizeOrder(raw) {
  if (!raw || typeof raw !== "object" || !isOrderNumber(raw.orderNumber)) return null;
  const created = new Date(raw.createdAt);
  if (Number.isNaN(created.getTime())) return null;

  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map((i) => {
      if (!i || !isProductId(i.id)) return null;
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

  const c = raw.customer || {};
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
    adminNote: cleanText(raw.adminNote, 300),
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map((w) => cleanText(w, 200)).filter(Boolean).slice(0, 20) : [],
  };
}

export function sanitizeOrders(list) {
  if (!Array.isArray(list)) return [];
  return uniqueBy(list.map(sanitizeOrder).filter(Boolean), (o) => o.orderNumber).slice(-2000);
}

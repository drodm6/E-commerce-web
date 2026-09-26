// Order codes let an order travel from the customer's phone to the owner's
// admin panel without a server: the WhatsApp message carries a compact,
// encoded copy of the order, and the owner pastes that message into
// Admin → Orders → "Import from WhatsApp".
//
// The code is NOT trusted. Everything is re-validated, product names and
// prices are re-read from the catalog, totals are recomputed, and any
// mismatch (e.g. a customer editing the price) is flagged for the owner.

import { computeTotals, round2 } from "./helpers.js";
import { sanitizeOrder } from "./validate.js";

const PREFIX = "FRST1.";
const MAX_CODE_LENGTH = 6000;

function toB64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(b64) {
  const norm = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(norm + "===".slice((norm.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeOrder(order) {
  const c = order.customer;
  const compact = {
    n: order.orderNumber,
    d: order.createdAt,
    c: [c.name, c.phone, c.city, c.address, c.notes],
    i: order.items.map((i) => [i.id, i.qty, i.size, i.color, i.price]),
    t: order.total,
  };
  return PREFIX + toB64Url(JSON.stringify(compact));
}

// Returns { order, warnings } or throws an Error with a friendly message.
export function decodeOrder(text, products) {
  const match = String(text || "").match(/FRST1\.[A-Za-z0-9_-]+/);
  if (!match) throw new Error("No Frost order code found. Paste the customer's whole WhatsApp message.");
  if (match[0].length > MAX_CODE_LENGTH) throw new Error("This order code is too long to be valid.");

  let data;
  try {
    data = JSON.parse(fromB64Url(match[0].slice(PREFIX.length)));
  } catch {
    throw new Error("The order code is damaged — ask the customer to resend the message without editing it.");
  }
  if (!data || typeof data !== "object" || !Array.isArray(data.i) || !Array.isArray(data.c)) {
    throw new Error("The order code is not in the expected format.");
  }

  const warnings = [];
  const byId = new Map(products.map((p) => [p.id, p]));

  const items = data.i.slice(0, 40).map((row) => {
    const [id, qty, size, color, claimedPrice] = Array.isArray(row) ? row : [];
    const p = byId.get(id);
    if (!p) {
      warnings.push(`Unknown product ${String(id).slice(0, 20)} — check it manually.`);
      return { id, name: String(id), qty, size, color, price: claimedPrice };
    }
    if (Number(claimedPrice) !== p.price) {
      warnings.push(`${p.name}: customer's price ${claimedPrice} differs from catalog price ${p.price}. Catalog price used.`);
    }
    if (p.sizes.length && !p.sizes.includes(size)) warnings.push(`${p.name}: size "${String(size).slice(0, 10)}" is not in the catalog.`);
    if (p.colors.length && !p.colors.some((c) => c.name === color)) warnings.push(`${p.name}: colour "${String(color).slice(0, 20)}" is not in the catalog.`);
    return { id, name: p.name, qty, size, color, price: p.price };
  });

  const [name, phone, city, address, notes] = data.c;
  const order = sanitizeOrder({
    orderNumber: data.n,
    createdAt: data.d,
    customer: { name, phone, city, address, notes },
    items,
    status: "new",
  });
  if (!order) throw new Error("The order code contains invalid data and could not be imported.");
  if (order.items.length !== items.length) warnings.push("Some lines were invalid and were skipped.");

  const totals = computeTotals(order.items);
  if (round2(Number(data.t)) !== totals.total) {
    warnings.push(`Total on customer's receipt (${data.t}) differs from the recalculated total (${totals.total}).`);
  }

  return { order: { ...order, ...totals, warnings }, warnings };
}

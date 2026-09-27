// Browser storage for the shopper's own conveniences only: their bag and
// their receipts (order number + secret receipt token). Everything read
// back is treated as untrusted and re-validated. Orders and products live
// on the server.

import { sanitizeOrders } from "./validate.js";

const KEYS = { MY_ORDERS: "frost_my_orders", CART: "frost_cart" };

// Clean up keys from older versions of the site.
try {
  ["zonlet_products", "zonlet_orders", "zonlet_cart", "frost_catalog_draft", "frost_admin_orders", "frost_admin_guard"].forEach((k) =>
    localStorage.removeItem(k)
  );
} catch {
  /* storage unavailable */
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw.length > 1_000_000) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — not critical */
  }
}

export const loadMyOrders = () => sanitizeOrders(read(KEYS.MY_ORDERS, []));
export const saveMyOrders = (orders) => write(KEYS.MY_ORDERS, orders);
export const loadCartRaw = () => read(KEYS.CART, []);
export const saveCart = (cart) => write(KEYS.CART, cart);

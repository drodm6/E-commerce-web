// All persistence lives in the browser's localStorage, so data is saved
// per-browser/per-device. Anything read back is treated as untrusted
// (it can be edited in devtools) and is re-validated before use.
// Every call is wrapped in try/catch so a storage failure (private
// browsing, quota exceeded) never crashes the app.

import { sanitizeProducts, sanitizeOrders } from "./validate.js";

const KEYS = {
  CATALOG_DRAFT: "frost_catalog_draft", // admin's unpublished product edits
  MY_ORDERS: "frost_my_orders", // orders the customer placed on this device
  CART: "frost_cart",
  ADMIN_ORDERS: "frost_admin_orders", // orders the owner logged in the admin panel
  ADMIN_GUARD: "frost_admin_guard", // failed-login counter / lockout
};

// Clean up keys from the old "Zonlet" version of the site.
try {
  ["zonlet_products", "zonlet_orders", "zonlet_cart"].forEach((k) => localStorage.removeItem(k));
} catch {
  /* storage unavailable */
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw.length > 4_000_000) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("Could not save to browser storage:", e);
    return false;
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const loadCatalogDraft = () => {
  const raw = read(KEYS.CATALOG_DRAFT, null);
  return Array.isArray(raw) ? sanitizeProducts(raw) : null;
};
export const saveCatalogDraft = (products) => write(KEYS.CATALOG_DRAFT, products);
export const clearCatalogDraft = () => remove(KEYS.CATALOG_DRAFT);

export const loadMyOrders = () => sanitizeOrders(read(KEYS.MY_ORDERS, []));
export const saveMyOrders = (orders) => write(KEYS.MY_ORDERS, orders);

export const loadCartRaw = () => read(KEYS.CART, []);
export const saveCart = (cart) => write(KEYS.CART, cart);

export const loadAdminOrders = () => sanitizeOrders(read(KEYS.ADMIN_ORDERS, []));
export const saveAdminOrders = (orders) => write(KEYS.ADMIN_ORDERS, orders);

export const loadGuard = () => {
  const g = read(KEYS.ADMIN_GUARD, {});
  return {
    fails: Number.isInteger(g.fails) && g.fails >= 0 ? g.fails : 0,
    lockedUntil: Number.isFinite(g.lockedUntil) ? g.lockedUntil : 0,
  };
};
export const saveGuard = (g) => write(KEYS.ADMIN_GUARD, g);

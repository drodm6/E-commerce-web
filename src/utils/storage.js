// All persistence for this project lives in the browser's localStorage.
// That means data is saved per-browser/per-device (not shared between
// different customers' computers) unless you replace this with a real
// backend/database later. Each function is wrapped in try/catch so a
// storage failure (e.g. private browsing mode) never crashes the app.

const KEYS = {
  PRODUCTS: "zonlet_products",
  ORDERS: "zonlet_orders",
  CART: "zonlet_cart",
};

export function loadProducts() {
  try {
    const raw = localStorage.getItem(KEYS.PRODUCTS);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load products from storage:", e);
    return null;
  }
}

export function saveProducts(products) {
  try {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  } catch (e) {
    console.error("Failed to save products to storage:", e);
  }
}

export function loadOrders() {
  try {
    const raw = localStorage.getItem(KEYS.ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load orders from storage:", e);
    return [];
  }
}

export function saveOrders(orders) {
  try {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  } catch (e) {
    console.error("Failed to save orders to storage:", e);
  }
}

export function loadCart() {
  try {
    const raw = localStorage.getItem(KEYS.CART);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load cart from storage:", e);
    return [];
  }
}

export function saveCart(cart) {
  try {
    localStorage.setItem(KEYS.CART, JSON.stringify(cart));
  } catch (e) {
    console.error("Failed to save cart to storage:", e);
  }
}

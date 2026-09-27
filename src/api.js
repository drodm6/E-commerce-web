// Tiny client for the Frost API. Same-origin only; the admin session lives
// in an httpOnly cookie that JavaScript can't read.

export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

async function request(path, { method = "GET", body, headers = {}, timeout = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-Frost-Request": "1", // CSRF guard
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch {
    throw new ApiError(0, "Can't reach the shop right now. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) throw new ApiError(res.status, data?.error || "Something went wrong.", data?.fields);
  return data;
}

export const api = {
  // Storefront
  products: () => request("/api/products").then((d) => d.products),
  placeOrder: (payload) => request("/api/orders", { method: "POST", body: payload }),
  myOrder: (orderNumber, token) =>
    request(`/api/orders/${encodeURIComponent(orderNumber)}`, { headers: { "X-Order-Token": token } }).then((d) => d.order),

  // Admin
  admin: {
    login: (password, code) => request("/api/admin/login", { method: "POST", body: { password, code } }),
    me: () => request("/api/admin/me"),
    logout: () => request("/api/admin/logout", { method: "POST", body: {} }),
    logoutAll: () => request("/api/admin/logout-all", { method: "POST", body: {} }),
    audit: () => request("/api/admin/audit").then((d) => d.events),
    products: () => request("/api/admin/products").then((d) => d.products),
    createProduct: (p) => request("/api/admin/products", { method: "POST", body: p }).then((d) => d.product),
    updateProduct: (id, p) => request(`/api/admin/products/${encodeURIComponent(id)}`, { method: "PUT", body: p }).then((d) => d.product),
    deleteProduct: (id) => request(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" }),
    orders: ({ status, q } = {}) => {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (q) qs.set("q", q);
      return request(`/api/admin/orders${qs.size ? `?${qs}` : ""}`).then((d) => d.orders);
    },
    order: (n) => request(`/api/admin/orders/${encodeURIComponent(n)}`),
    updateOrder: (n, patch) => request(`/api/admin/orders/${encodeURIComponent(n)}`, { method: "PATCH", body: patch }).then((d) => d.order),
    deleteOrder: (n) => request(`/api/admin/orders/${encodeURIComponent(n)}`, { method: "DELETE" }),
  },
};

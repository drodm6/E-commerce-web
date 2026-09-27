import { Router } from "express";
import { HttpError } from "../errors.js";
import { COOKIE } from "../security/auth.js";
import { requireAdmin } from "../security/middleware.js";
import { isOrderNumber, isProductId, validateProductInput, validateOrderUpdate, cleanText, STATUS_IDS_LIST } from "../../shared/validate.js";

export function adminRoutes({ products, orders, auth, config, limiters }) {
  const r = Router();
  r.use(limiters.admin);
  r.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  // ── Session ────────────────────────────────────────────────
  r.post("/login", limiters.login, async (req, res) => {
    const { password, code } = req.body ?? {};
    const { token, expiresAt } = await auth.login(
      { password: typeof password === "string" ? password : "", code: typeof code === "string" ? code : "" },
      { ip: req.ip, userAgent: req.get("user-agent") }
    );
    res.cookie(COOKIE, token, auth.cookieOptions());
    res.json({ ok: true, expiresAt, idleMinutes: config.admin.idleMinutes });
  });

  const authed = requireAdmin(auth);

  r.get("/me", authed, (req, res) => {
    res.json({ ok: true, expiresAt: req.session.expires_at, idleMinutes: config.admin.idleMinutes });
  });

  r.post("/logout", authed, (req, res) => {
    auth.logout(req.session.id);
    auth.audit("logout", req.ip);
    res.clearCookie(COOKIE, { path: "/api/admin" });
    res.json({ ok: true });
  });

  r.post("/logout-all", authed, (req, res) => {
    auth.logoutAll();
    auth.audit("logout_all", req.ip);
    res.clearCookie(COOKIE, { path: "/api/admin" });
    res.json({ ok: true });
  });

  r.get("/audit", authed, (req, res) => res.json({ events: auth.auditLog(30) }));

  // ── Products ───────────────────────────────────────────────
  const productParam = (req) => {
    if (!isProductId(req.params.id)) throw new HttpError(404, "Product not found.");
    return req.params.id;
  };

  r.get("/products", authed, (req, res) => res.json({ products: products.list() }));

  r.post("/products", authed, (req, res) => {
    const { ok, errors, value } = validateProductInput(req.body);
    if (!ok) throw new HttpError(422, "Please fix the highlighted fields.", errors);
    const product = products.create(value);
    auth.audit("product_created", req.ip, product.id);
    res.status(201).json({ product });
  });

  r.put("/products/:id", authed, (req, res) => {
    const id = productParam(req);
    const { ok, errors, value } = validateProductInput(req.body);
    if (!ok) throw new HttpError(422, "Please fix the highlighted fields.", errors);
    const product = products.update(id, value);
    if (!product) throw new HttpError(404, "Product not found.");
    auth.audit("product_updated", req.ip, id);
    res.json({ product });
  });

  r.delete("/products/:id", authed, (req, res) => {
    const id = productParam(req);
    if (!products.remove(id)) throw new HttpError(404, "Product not found.");
    auth.audit("product_deleted", req.ip, id);
    res.json({ ok: true });
  });

  // ── Orders ─────────────────────────────────────────────────
  const orderParam = (req) => {
    if (!isOrderNumber(req.params.orderNumber)) throw new HttpError(404, "Order not found.");
    return req.params.orderNumber;
  };

  r.get("/orders", authed, (req, res) => {
    const status = STATUS_IDS_LIST.includes(req.query.status) ? req.query.status : undefined;
    const search = cleanText(typeof req.query.q === "string" ? req.query.q : "", 60) || undefined;
    res.json({ orders: orders.list({ status, search }) });
  });

  // Full detail for double-checking a WhatsApp receipt screenshot.
  r.get("/orders/:orderNumber", authed, (req, res) => {
    const order = orders.get(orderParam(req));
    if (!order) throw new HttpError(404, "Order not found.");
    const customerOrders = orders
      .list({ search: order.customer.phone.replace(/\D/g, "").slice(-9) || order.customer.phone, limit: 20 })
      .filter((o) => o.orderNumber !== order.orderNumber)
      .map(({ orderNumber, createdAt, status, total }) => ({ orderNumber, createdAt, status, total }));
    const catalog = new Map(products.list().map((p) => [p.id, p]));
    const items = order.items.map((i) => {
      const p = catalog.get(i.id);
      return { ...i, currentPrice: p ? p.price : null, inCatalog: Boolean(p), art: p?.art, image: p?.images[0] || null, hex: p?.colors.find((c) => c.name === i.color)?.hex || null };
    });
    res.json({ order: { ...order, items }, customerOrders });
  });

  r.patch("/orders/:orderNumber", authed, (req, res) => {
    const id = orderParam(req);
    const { ok, errors, value } = validateOrderUpdate(req.body);
    if (!ok) throw new HttpError(422, "Invalid update.", errors);
    const order = orders.update(id, value);
    if (!order) throw new HttpError(404, "Order not found.");
    if (value.status) auth.audit("order_status", req.ip, `${id} → ${value.status}`);
    res.json({ order });
  });

  r.delete("/orders/:orderNumber", authed, (req, res) => {
    const id = orderParam(req);
    if (!orders.remove(id)) throw new HttpError(404, "Order not found.");
    auth.audit("order_deleted", req.ip, id);
    res.json({ ok: true });
  });

  return r;
}

import { Router } from "express";
import { HttpError } from "../errors.js";
import { publicOrder } from "../repos/orders.js";
import { isOrderNumber, isProductId, isAccessToken, validateOrderInput } from "../../shared/validate.js";

export function publicRoutes({ products, orders, limiters }) {
  const r = Router();

  // GET /api/products — the catalog
  r.get("/products", (req, res) => {
    res.set("Cache-Control", "no-cache"); // always fresh after you edit products (ETag keeps it cheap)
    res.json({ products: products.list() });
  });

  // GET /api/products/:id
  r.get("/products/:id", (req, res) => {
    const p = isProductId(req.params.id) ? products.get(req.params.id) : null;
    if (!p) throw new HttpError(404, "Product not found.");
    res.json({ product: p });
  });

  // POST /api/orders — place an order (cash on delivery)
  r.post("/orders", limiters.placeOrder, (req, res) => {
    // Honeypot: a hidden form field real customers never fill in.
    if (req.body?.website) throw new HttpError(400, "Order could not be placed.");
    const { ok, errors, value } = validateOrderInput(req.body);
    if (!ok) throw new HttpError(422, "Please check your details.", errors);
    const { order, accessToken } = orders.create(value);
    res.set("Cache-Control", "no-store"); // contains personal details
    res.status(201).json({ order: publicOrder(order), accessToken });
  });

  // GET /api/orders/:orderNumber — a customer re-opening their own receipt.
  // Requires the secret receipt token given at checkout (X-Order-Token).
  r.get("/orders/:orderNumber", limiters.orderLookup, (req, res) => {
    const token = req.get("x-order-token");
    const order =
      isOrderNumber(req.params.orderNumber) && isAccessToken(token) ? orders.getForCustomer(req.params.orderNumber, token) : null;
    if (!order) throw new HttpError(404, "Order not found."); // same answer for "wrong token" — no enumeration
    res.set("Cache-Control", "no-store");
    res.json({ order });
  });

  return r;
}

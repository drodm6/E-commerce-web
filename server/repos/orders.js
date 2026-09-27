import { HttpError } from "../errors.js";
import { randomCode, randomToken, sha256 } from "../security/ids.js";
import { computeTotals } from "../../shared/pricing.js";

const now = () => new Date().toISOString();
const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => "\\" + c);

function toOrder(row) {
  if (!row) return null;
  return {
    orderNumber: row.order_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    customer: JSON.parse(row.customer),
    items: JSON.parse(row.items),
    subtotal: row.subtotal,
    shipping: row.shipping,
    total: row.total,
    adminNote: row.admin_note,
    history: JSON.parse(row.history),
  };
}

// What a customer may see about their own order (no internal notes).
export function publicOrder(o) {
  const { adminNote, history, updatedAt, ...rest } = o;
  return rest;
}

export function ordersRepo(db, products) {
  const q = {
    get: db.prepare("SELECT * FROM orders WHERE order_number = ?"),
    exists: db.prepare("SELECT 1 FROM orders WHERE order_number = ?"),
    insert: db.prepare(`INSERT INTO orders
      (order_number, created_at, updated_at, status, customer_name, customer_phone, customer, items, subtotal, shipping, total, admin_note, history, token_hash)
      VALUES (@orderNumber, @createdAt, @createdAt, 'new', @name, @phone, @customer, @items, @subtotal, @shipping, @total, '', @history, @tokenHash)`),
    update: db.prepare("UPDATE orders SET status = ?, admin_note = ?, history = ?, updated_at = ? WHERE order_number = ?"),
    remove: db.prepare("DELETE FROM orders WHERE order_number = ?"),
    countByPhone: db.prepare("SELECT COUNT(*) AS n FROM orders WHERE customer_phone = ?"),
  };

  // Place an order. Prices come from the catalog, never from the client.
  // Runs in one transaction so stock can't be oversold.
  const create = db.transaction(({ customer, items }) => {
    const lines = items.map((it) => {
      const p = products.get(it.id);
      if (!p) throw new HttpError(409, "A product in your bag is no longer available. Please refresh.");
      if (p.sizes.length && !p.sizes.includes(it.size)) throw new HttpError(422, `Please choose a valid size for ${p.name}.`);
      if (!p.sizes.length && it.size) throw new HttpError(422, `${p.name} doesn't come in sizes.`);
      if (p.colors.length && !p.colors.some((c) => c.name === it.color)) throw new HttpError(422, `Please choose a valid colour for ${p.name}.`);
      return { id: p.id, name: p.name, size: it.size, color: it.color, qty: it.qty, price: p.price, product: p };
    });

    // Check stock per product across all its lines (sizes/colours share stock).
    const needed = new Map();
    for (const l of lines) needed.set(l.id, (needed.get(l.id) || 0) + l.qty);
    for (const [id, qty] of needed) {
      const p = products.get(id);
      if (p.stock < qty) throw new HttpError(409, p.stock > 0 ? `Only ${p.stock} left of ${p.name}.` : `${p.name} is sold out.`);
    }
    for (const [id, qty] of needed) products.setStock(id, products.get(id).stock - qty);

    let orderNumber;
    do orderNumber = `FR-${randomCode(8)}`;
    while (q.exists.get(orderNumber));

    const clean = lines.map(({ product, ...l }) => l);
    const totals = computeTotals(clean);
    const createdAt = now();
    const accessToken = randomToken(24);
    q.insert.run({
      orderNumber,
      createdAt,
      name: customer.name,
      phone: customer.phone.replace(/\D/g, ""),
      customer: JSON.stringify(customer),
      items: JSON.stringify(clean),
      ...totals,
      history: JSON.stringify([{ status: "new", at: createdAt }]),
      tokenHash: sha256(accessToken),
    });
    return { order: toOrder(q.get.get(orderNumber)), accessToken };
  });

  function adjustStock(items, direction) {
    const byId = new Map();
    for (const i of items) byId.set(i.id, (byId.get(i.id) || 0) + i.qty);
    for (const [id, qty] of byId) {
      const p = products.get(id);
      if (!p) continue; // product was deleted — nothing to restock
      const next = p.stock + direction * qty;
      if (next < 0) throw new HttpError(409, `Not enough stock of ${p.name} to re-open this order.`);
      products.setStock(id, next);
    }
  }

  const update = db.transaction((orderNumber, patch) => {
    const o = toOrder(q.get.get(orderNumber));
    if (!o) return null;
    const status = patch.status ?? o.status;
    const history = [...o.history];
    if (status !== o.status) {
      // Cancelling returns items to stock; re-opening takes them again.
      if (status === "cancelled") adjustStock(o.items, +1);
      if (o.status === "cancelled") adjustStock(o.items, -1);
      history.push({ status, at: now() });
    }
    q.update.run(status, patch.adminNote ?? o.adminNote, JSON.stringify(history.slice(-50)), now(), orderNumber);
    return toOrder(q.get.get(orderNumber));
  });

  return {
    create,
    update,

    get: (orderNumber) => toOrder(q.get.get(orderNumber)),

    // Returns the order only if the receipt token matches (prevents IDOR:
    // knowing an order number alone never reveals someone's details).
    getForCustomer(orderNumber, token) {
      const row = q.get.get(orderNumber);
      if (!row || !token) return null;
      const a = Buffer.from(row.token_hash, "hex");
      const b = Buffer.from(sha256(token), "hex");
      return a.length === b.length && a.equals(b) ? publicOrder(toOrder(row)) : null;
    },

    list({ status, search, limit = 500 } = {}) {
      const where = [];
      const params = [];
      if (status) {
        where.push("status = ?");
        params.push(status);
      }
      if (search) {
        const like = `%${escapeLike(search)}%`;
        const digits = search.replace(/\D/g, "");
        where.push(`(order_number LIKE ? ESCAPE '\\' OR customer_name LIKE ? ESCAPE '\\' OR customer LIKE ? ESCAPE '\\'${digits.length >= 3 ? " OR customer_phone LIKE ?" : ""})`);
        params.push(like, like, like);
        if (digits.length >= 3) params.push(`%${digits}%`);
      }
      const sql = `SELECT * FROM orders ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC LIMIT ?`;
      return db.prepare(sql).all(...params, limit).map(toOrder);
    },

    customerOrderCount: (phone) => q.countByPhone.get(String(phone).replace(/\D/g, "")).n,

    remove: db.transaction((orderNumber) => {
      const o = toOrder(q.get.get(orderNumber));
      if (!o) return false;
      if (o.status !== "cancelled" && o.status !== "delivered") adjustStock(o.items, +1);
      return q.remove.run(orderNumber).changes > 0;
    }),
  };
}

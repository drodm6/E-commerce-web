import { randomCode } from "../security/ids.js";
import { sanitizeProduct } from "../../shared/validate.js";

export function productsRepo(db) {
  const q = {
    all: db.prepare("SELECT data FROM products ORDER BY sort, created_at"),
    get: db.prepare("SELECT data FROM products WHERE id = ?"),
    exists: db.prepare("SELECT 1 FROM products WHERE id = ?"),
    maxSort: db.prepare("SELECT COALESCE(MAX(sort), 0) AS m FROM products"),
    insert: db.prepare("INSERT INTO products (id, data, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"),
    update: db.prepare("UPDATE products SET data = ?, updated_at = ? WHERE id = ?"),
    remove: db.prepare("DELETE FROM products WHERE id = ?"),
  };
  const parse = (row) => (row ? sanitizeProduct(JSON.parse(row.data)) : null);

  return {
    list: () => q.all.all().map(parse).filter(Boolean),
    get: (id) => parse(q.get.get(id)),

    create(fields) {
      let id;
      do id = `P-${randomCode(6)}`;
      while (q.exists.get(id));
      const product = sanitizeProduct({ ...fields, id });
      const now = new Date().toISOString();
      q.insert.run(id, JSON.stringify(product), q.maxSort.get().m + 1, now, now);
      return product;
    },

    update(id, fields) {
      if (!q.exists.get(id)) return null;
      const product = sanitizeProduct({ ...fields, id });
      q.update.run(JSON.stringify(product), new Date().toISOString(), id);
      return product;
    },

    // Used inside order transactions.
    setStock(id, stock) {
      const p = parse(q.get.get(id));
      if (!p) return;
      q.update.run(JSON.stringify({ ...p, stock }), new Date().toISOString(), id);
    },

    remove: (id) => q.remove.run(id).changes > 0,
  };
}

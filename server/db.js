// SQLite database (one file, no separate DB server to run).
// All queries elsewhere use prepared statements with bound parameters —
// never string concatenation — so SQL injection isn't possible.

import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./config.js";
import { sanitizeProducts } from "../shared/validate.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  data        TEXT NOT NULL,           -- validated product JSON
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  order_number   TEXT PRIMARY KEY,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  status         TEXT NOT NULL,
  customer_name  TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer       TEXT NOT NULL,        -- JSON
  items          TEXT NOT NULL,        -- JSON (price snapshot at order time)
  subtotal       REAL NOT NULL,
  shipping       REAL NOT NULL,
  total          REAL NOT NULL,
  admin_note     TEXT NOT NULL DEFAULT '',
  history        TEXT NOT NULL,        -- JSON status timeline
  token_hash     TEXT NOT NULL         -- sha256 of the customer's receipt token
);
CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS orders_phone ON orders(customer_phone);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  created_at  INTEGER NOT NULL,
  last_seen   INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  ip          TEXT NOT NULL,
  user_agent  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  at      TEXT NOT NULL,
  event   TEXT NOT NULL,
  ip      TEXT NOT NULL,
  detail  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS kv (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
`;

export function openDatabase(file) {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA);
  seedProducts(db);
  return db;
}

// First run only: load the starter catalog from src/data/products.json.
function seedProducts(db) {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM products").get();
  const seeded = db.prepare("SELECT value FROM kv WHERE key = 'seeded'").get();
  if (n > 0 || seeded) return;
  const raw = JSON.parse(readFileSync(path.join(ROOT, "src", "data", "products.json"), "utf8"));
  const insert = db.prepare("INSERT INTO products (id, data, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?)");
  const now = new Date().toISOString();
  db.transaction(() => {
    sanitizeProducts(raw).forEach((p, i) => insert.run(p.id, JSON.stringify(p), i, now, now));
    db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES ('seeded', '1')").run();
  })();
}

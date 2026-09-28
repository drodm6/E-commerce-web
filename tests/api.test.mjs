// API + security tests.  Run with:  npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../server/config.js";
import { openDatabase } from "../server/db.js";
import { createApp } from "../server/app.js";
import { hashPassword } from "../server/security/password.js";
import { generateSecret, totpAt, currentStep } from "../server/security/totp.js";

const PASSWORD = "warm coats ship by sea";
const SECRET = generateSecret();
let server, base, db, passwordHash;
const extra = [];

const H = { "Content-Type": "application/json", "X-Frost-Request": "1" };
const api = (path, { method = "GET", body, headers = {}, cookie, at = base } = {}) =>
  fetch(at + path, {
    method,
    headers: { ...(body !== undefined ? H : { "X-Frost-Request": "1" }), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

const customer = { name: "Sara Ahmed", phone: "+964 750 123 4567", governorate: "Erbil", city: "Erbil", address: "100m Street, near Family Mall", notes: "" };
const coat = { id: "P-1001", size: "M", color: "Camel", qty: 1 };




async function startApp() {
  const config = loadConfig({
    skipEnvFile: true,
    env: { NODE_ENV: "test", JWT_SECRET: "x".repeat(40), ADMIN_PASSWORD_HASH: passwordHash, ADMIN_TOTP_SECRET: SECRET },
    config: { serveStatic: false, cookieSecure: false },
  });
  const database = openDatabase(":memory:");
  const srv = createApp({ config, db: database }).listen(0);
  extra.push(() => (srv.close(), database.close()));
  return { srv, database, url: `http://127.0.0.1:${srv.address().port}` };
}

before(async () => {
  passwordHash = await hashPassword(PASSWORD);
  ({ srv: server, database: db, url: base } = await startApp());
});
after(() => extra.forEach((fn) => fn()));

// Signs in on a fresh server instance (each 2FA code works only once, and
// sign-in is rate limited — both would otherwise trip across tests).
async function login() {
  const { url } = await startApp();
  const res = await api("/api/admin/login", { method: "POST", at: url, body: { password: PASSWORD, code: totpAt(SECRET, currentStep()) } });
  assert.equal(res.status, 200, await res.clone().text());
  const cookie = res.headers.get("set-cookie").split(";")[0];
  const bound = (path, opts = {}) => api(path, { ...opts, cookie, at: url });
  return { cookie, url, call: bound };
}

test("catalog is public and seeded", async () => {
  const res = await api("/api/products");
  assert.equal(res.status, 200);
  const { products } = await res.json();
  assert.equal(products.length, 12);
  assert.equal(res.headers.get("x-powered-by"), null);
  assert.match(res.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-frame-options"), "DENY");
});

test("placing an order: server sets prices (tampering ignored), stock goes down", async () => {
  const before = (await (await api("/api/products/P-1001")).json()).product.stock;
  const res = await api("/api/orders", { method: "POST", body: { customer, items: [{ ...coat, price: 0.01, qty: 2 }], total: 0.01 } });
  assert.equal(res.status, 201);
  const { order, accessToken } = await res.json();
  assert.match(order.orderNumber, /^FR-[A-Z0-9]{8}$/);
  assert.equal(order.items[0].price, 64);
  assert.equal(order.total, 128); // free delivery from $80
  assert.equal(order.shipping, 0);
  assert.ok(accessToken.length >= 20);
  assert.equal(order.adminNote, undefined);
  const after = (await (await api("/api/products/P-1001")).json()).product.stock;
  assert.equal(after, before - 2);
});

test("orders under $80 pay delivery", async () => {
  const res = await api("/api/orders", { method: "POST", body: { customer, items: [{ id: "P-1009", color: "Oat", size: "", qty: 1 }] } });
  const { order } = await res.json();
  assert.equal(order.shipping, 4.99);
});

test("invalid input is rejected with field errors", async () => {
  const res = await api("/api/orders", { method: "POST", body: { customer: { ...customer, phone: "call me", governorate: "Narnia" }, items: [coat] } });
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.ok(body.fields.phone && body.fields.governorate);
  const r2 = await api("/api/orders", { method: "POST", body: { customer, items: [{ ...coat, size: "XXXL" }] } });
  assert.equal(r2.status, 422);
  const r3 = await api("/api/orders", { method: "POST", body: { customer, items: [{ ...coat, qty: 999 }] } });
  assert.equal(r3.status, 422);
  const r4 = await api("/api/orders", { method: "POST", body: { customer, items: [{ id: "P-1012", size: "M", color: "Oat", qty: 20 }] } });
  assert.equal(r4.status, 409); // more than in stock
});

test("XSS payloads are stored as plain text, never as markup", async () => {
  const xss = '<img src=x onerror=alert(1)>';
  const res = await api("/api/orders", { method: "POST", body: { customer: { ...customer, name: xss, notes: "<script>alert(1)</script>" }, items: [coat] } });
  assert.equal(res.status, 201);
  assert.match(res.headers.get("content-type"), /application\/json/);
  const { order } = await res.json();
  assert.equal(order.customer.name, xss); // React renders this as text
});

test("IDOR: an order can't be read with just its number", async () => {
  const { order, accessToken } = await (await api("/api/orders", { method: "POST", body: { customer, items: [coat] } })).json();
  assert.equal((await api(`/api/orders/${order.orderNumber}`)).status, 404);
  assert.equal((await api(`/api/orders/${order.orderNumber}`, { headers: { "X-Order-Token": "A".repeat(32) } })).status, 404);
  const ok = await api(`/api/orders/${order.orderNumber}`, { headers: { "X-Order-Token": accessToken } });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).order.orderNumber, order.orderNumber);
});

test("CSRF: write requests need the custom header and a same-site origin", async () => {
  const noHeader = await fetch(base + "/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer, items: [coat] }) });
  assert.equal(noHeader.status, 403);
  const evil = await api("/api/orders", { method: "POST", body: { customer, items: [coat] }, headers: { Origin: "https://evil.example" } });
  assert.equal(evil.status, 403);
  const form = await fetch(base + "/api/orders", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Frost-Request": "1" }, body: "a=1" });
  assert.equal(form.status, 415);
  // behind an HTTPS proxy the browser's Origin is https:// while the server sees http:// — same host is fine
  const proxied = await api("/api/orders", { method: "POST", body: { customer, items: [coat] }, headers: { Origin: base.replace("http:", "https:") } });
  assert.equal(proxied.status, 201);
  const pre = await fetch(base + "/api/orders", { method: "OPTIONS", headers: { Origin: "https://evil.example" } });
  assert.equal(pre.status, 403);
});

test("oversized and malformed bodies are refused", async () => {
  assert.equal((await api("/api/orders", { method: "POST", body: JSON.stringify({ x: "a".repeat(30_000) }) })).status, 413);
  const bad = await api("/api/orders", { method: "POST", body: "{nope" });
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).error, "Invalid JSON.");
});

test("honeypot field blocks bots", async () => {
  assert.equal((await api("/api/orders", { method: "POST", body: { customer, items: [coat], website: "spam.com" } })).status, 400);
});

test("admin API requires sign-in", async () => {
  for (const [m, p] of [["GET", "/api/admin/orders"], ["GET", "/api/admin/products"], ["POST", "/api/admin/products"], ["DELETE", "/api/admin/products/P-1001"], ["GET", "/api/admin/me"]]) {
    const res = await api(p, { method: m, body: m === "POST" ? {} : undefined });
    assert.equal(res.status, 401, `${m} ${p}`);
  }
  const forged = await api("/api/admin/orders", { cookie: "frost_admin=eyJhbGciOiJub25lIn0.eyJzaWQiOiJ4In0." });
  assert.equal(forged.status, 401); // alg=none / forged tokens rejected
});

test("admin login: wrong password or code fails, 2FA required, cookie is locked down", async () => {
  assert.equal((await api("/api/admin/login", { method: "POST", body: { password: "wrong", code: totpAt(SECRET, currentStep()) } })).status, 401);
  assert.equal((await api("/api/admin/login", { method: "POST", body: { password: PASSWORD, code: "000000" } })).status, 401);
  assert.equal((await api("/api/admin/login", { method: "POST", body: { password: PASSWORD } })).status, 401);
  const code = totpAt(SECRET, currentStep()); // captured once so the replay below reuses the exact same code
  const res = await api("/api/admin/login", { method: "POST", body: { password: PASSWORD, code } });
  assert.equal(res.status, 200);
  const cookie = res.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.match(cookie, /Path=\/api\/admin/i);
  // replay: the same code can't be used twice
  assert.equal((await api("/api/admin/login", { method: "POST", body: { password: PASSWORD, code } })).status, 401);
});

test("admin can manage products; invalid/unsafe fields rejected (SSRF/XSS URLs)", async () => {
  const { call } = await login();
  for (const url of ["javascript:alert(1)", "http://169.254.169.254/latest/meta-data", "file:///etc/passwd", "//evil.com/x.png", "data:text/html,<script>"]) {
    const res = await call("/api/admin/products", { method: "POST", body: { name: "Test", price: 10, category: "Coats", images: [url] } });
    assert.equal(res.status, 422, url);
  }
  const res = await call("/api/admin/products", { method: "POST", body: { name: "Teddy Jacket", price: 39, stock: 5, category: "Jackets", sizes: ["S", "M"], colors: [{ name: "Cream", hex: "#efe4d2" }], images: ["https://img.example.com/a.jpg"], id: "P-HACKED", isAdmin: true } });
  assert.equal(res.status, 201);
  const { product } = await res.json();
  assert.notEqual(product.id, "P-HACKED"); // mass assignment ignored
  assert.equal(product.isAdmin, undefined);
  const upd = await call(`/api/admin/products/${product.id}`, { method: "PUT", body: { ...product, price: 35 } });
  assert.equal((await upd.json()).product.price, 35);
  assert.equal((await call(`/api/admin/products/${product.id}`, { method: "DELETE" })).status, 200);
  assert.equal((await call(`/api/admin/products/..%2F..%2Fetc`, { method: "DELETE" })).status, 404);
});

test("admin sees full order detail and can update status; cancel restocks", async () => {
  const { call } = await login();
  const { order } = await (await call("/api/orders", { method: "POST", body: { customer, items: [{ id: "P-1003", size: "L", color: "Oat", qty: 2 }] } })).json();
  const stock0 = (await (await call("/api/products/P-1003")).json()).product.stock;

  const found = await (await call(`/api/admin/orders?q=${order.orderNumber}`)).json();
  assert.equal(found.orders.length, 1);
  await call("/api/orders", { method: "POST", body: { customer, items: [coat] } });
  const byPhone = await (await call(`/api/admin/orders?q=7501234567`)).json();
  assert.equal(byPhone.orders.length, 2);

  const detail = await (await call(`/api/admin/orders/${order.orderNumber}`)).json();
  assert.equal(detail.order.customer.governorate, "Erbil");
  assert.equal(detail.order.items[0].id, "P-1003");
  assert.ok(detail.customerOrders.length >= 1);

  const bad = await call(`/api/admin/orders/${order.orderNumber}`, { method: "PATCH", body: { status: "hacked" } });
  assert.equal(bad.status, 422);
  const upd = await (await call(`/api/admin/orders/${order.orderNumber}`, { method: "PATCH", body: { status: "cancelled", adminNote: "Customer changed mind" } })).json();
  assert.equal(upd.order.status, "cancelled");
  assert.equal(upd.order.history.length, 2);
  const stock1 = (await (await call("/api/products/P-1003")).json()).product.stock;
  assert.equal(stock1, stock0 + 2);

  // SQL injection attempts in search are harmless
  const sqli = await call(`/api/admin/orders?q=${encodeURIComponent("' OR 1=1 --")}`);
  assert.equal(sqli.status, 200);
  assert.equal((await sqli.json()).orders.length, 0);
});

test("logout revokes the session server-side", async () => {
  const { call } = await login();
  assert.equal((await call("/api/admin/me")).status, 200);
  assert.equal((await call("/api/admin/logout", { method: "POST", body: {} })).status, 200);
  assert.equal((await call("/api/admin/me")).status, 401); // old token is dead
});

test("rate limiting: repeated failed logins are blocked", async () => {
  let last;
  for (let i = 0; i < 7; i++) last = await api("/api/admin/login", { method: "POST", body: { password: "nope", code: "123456" } });
  assert.equal(last.status, 429);
});

test("parameter & prototype pollution are harmless", async () => {
  const { call } = await login();
  const r = await call("/api/admin/orders?status=new&status=cancelled&q=a&q=b");
  assert.equal(r.status, 200);
  const res = await call("/api/orders", {
    method: "POST",
    body: '{"customer":{"name":"Ali Test","phone":"07501234567","governorate":"Duhok","city":"Zakho","address":"Main street","__proto__":{"isAdmin":true}},"items":[{"id":"P-1009","color":"Oat","qty":1}],"__proto__":{"polluted":true}}',
  });
  assert.equal(res.status, 201);
  assert.equal({}.polluted, undefined);
  assert.equal({}.isAdmin, undefined);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("unknown API routes return JSON 404", async () => {
  const res = await api("/api/nope");
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: "Not found." });
});

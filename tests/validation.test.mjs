// Validation rules shared by the website and the server.  Run with:  npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  sanitizeProduct, sanitizeProducts, safeImageUrl, validateCustomer, sanitizeCart, cleanText,
  validateOrderInput, validateProductInput, validateOrderUpdate,
} from "../shared/validate.js";
import { computeTotals } from "../shared/pricing.js";
import { STORE } from "../shared/store.js";
import { verifyTotp, totpAt, generateSecret, currentStep } from "../server/security/totp.js";
import { hashPassword, verifyPassword } from "../server/security/password.js";

const products = sanitizeProducts(JSON.parse(readFileSync(new URL("../src/data/products.json", import.meta.url), "utf8")));
const customer = { name: "Ali", phone: "07501234567", governorate: "Duhok", city: "Zakho", address: "street 1" };

test("starter catalog is valid", () => assert.equal(products.length, 12));

test("image URLs: only https or site paths (blocks XSS/SSRF tricks)", () => {
  for (const bad of ["javascript:alert(1)", "data:image/svg+xml,<svg onload=alert(1)>", "http://x.com/a.jpg", "//evil.com/a.jpg", "https://user:pw@evil.com/a.jpg", "/../etc/passwd", "file:///etc/passwd"]) {
    assert.equal(safeImageUrl(bad), null, bad);
  }
  assert.equal(safeImageUrl("https://img.example.com/coat.jpg"), "https://img.example.com/coat.jpg");
  assert.equal(safeImageUrl("/products/coat-1.jpg"), "/products/coat-1.jpg");
});

test("products: bad ids, prices and colours are rejected or dropped", () => {
  assert.equal(sanitizeProduct({ ...products[0], id: "<script>" }), null);
  assert.equal(sanitizeProduct({ ...products[0], price: -5 }), null);
  assert.equal(sanitizeProduct({ ...products[0], colors: [{ name: "x", hex: "red;background:url(x)" }] }).colors.length, 0);
  assert.equal(sanitizeProduct({ ...products[0], name: "A".repeat(5000) }).name.length, 80);
  assert.equal(validateProductInput({ name: "Coat", price: 10, compareAt: 5 }).ok, false);
  assert.equal(validateProductInput({ name: "Coat", price: 10, category: "Weapons" }).ok, false);
  assert.equal(validateProductInput({ name: "Coat", price: 10 }).ok, true);
});

test("text: control and bidi-override characters are stripped", () => {
  assert.equal(cleanText("abc‮def\u0000", 50), "abcdef");
});

test("customers: governorate must be in Iraq/Kurdistan list, phone must be digits", () => {
  assert.equal(validateCustomer(customer).ok, true);
  assert.equal(validateCustomer({ ...customer, governorate: "Paris" }).ok, false);
  assert.equal(validateCustomer({ ...customer, phone: "call me" }).ok, false);
  assert.equal(validateCustomer(null).ok, false);
});

test("order input: prices are never accepted, duplicates merge, junk rejected", () => {
  const r = validateOrderInput({ customer, items: [{ id: "P-1001", size: "M", color: "Camel", qty: 1, price: 0 }, { id: "P-1001", size: "M", color: "Camel", qty: 2 }] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.items, [{ id: "P-1001", size: "M", color: "Camel", qty: 3 }]);
  assert.equal(validateOrderInput({ customer, items: [] }).ok, false);
  assert.equal(validateOrderInput({ customer, items: [{ id: "P-1001", qty: -1 }] }).ok, false);
  assert.equal(validateOrderInput("nope").ok, false);
});

test("order updates: only known statuses", () => {
  assert.equal(validateOrderUpdate({ status: "confirmed" }).ok, true);
  assert.equal(validateOrderUpdate({ status: "admin" }).ok, false);
  assert.equal(validateOrderUpdate({}).ok, false);
});

test("cart: unknown, invalid and over-stock lines are cleaned", () => {
  assert.equal(sanitizeCart([{ id: "P-9999", qty: 1 }], products).length, 0);
  assert.equal(sanitizeCart([{ id: "P-1012", qty: 20, size: "M", color: "Oat" }], products)[0].qty, 3);
  assert.equal(sanitizeCart([{ id: "P-1001", qty: 1, size: "XXXL", color: "Camel" }], products).length, 0);
});

test("delivery is free from the free-delivery amount", () => {
  const free = STORE.freeShippingThreshold;
  assert.equal(computeTotals([{ price: free, qty: 1 }]).shipping, 0);
  assert.equal(computeTotals([{ price: free - 0.01, qty: 1 }]).shipping, STORE.shippingFlat);
});

test("TOTP: matches RFC 6238 test vector, rejects replay", () => {
  // RFC 6238 SHA1 secret "12345678901234567890" at T=59s → 94287082 (last 6 digits 287082)
  const rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  assert.equal(totpAt(rfcSecret, 1), "287082");
  const s = generateSecret();
  const code = totpAt(s, currentStep());
  const step = verifyTotp(s, code);
  assert.notEqual(step, null);
  assert.equal(verifyTotp(s, code, { lastUsedStep: step }), null);
  assert.equal(verifyTotp(s, "12345"), null);
});

test("passwords: scrypt hash verifies only the right password", async () => {
  const h = await hashPassword("a long enough passphrase");
  assert.equal(await verifyPassword("a long enough passphrase", h), true);
  assert.equal(await verifyPassword("wrong", h), false);
  assert.equal(await verifyPassword("anything", "not-a-hash"), false);
});

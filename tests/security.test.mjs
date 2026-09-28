// Security & data-integrity checks for validation, order codes and IDs.
// Run with:  npm test
import { encodeOrder, decodeOrder } from "../src/utils/orderCode.js";
import { sanitizeProduct, sanitizeProducts, safeImageUrl, validateCustomer, sanitizeCart, cleanText } from "../src/utils/validate.js";
import { uid, computeTotals } from "../src/utils/helpers.js";
import { readFileSync } from "node:fs";
const products = sanitizeProducts(JSON.parse(readFileSync(new URL("../src/data/products.json", import.meta.url), "utf8")));
let fails = 0; const t = (name, ok) => { console.log((ok ? "✓ " : "✗ ") + name); if (!ok) fails++; };

t("catalog: all 12 products valid", products.length === 12);
const items = [{ id: "P-1001", name: "Camel Wool-Blend Long Coat", size: "M", color: "Camel", qty: 2, price: 64 }];
const order = { orderNumber: uid("FR"), createdAt: new Date().toISOString(), customer: { name: "سارة أحمد", phone: "+964 750 123 4567", city: "أربيل", address: "شارع 100", notes: "" }, items, ...computeTotals(items) };
const code = encodeOrder(order);
const { order: back, warnings } = decodeOrder("hi\n" + code + "\nthanks", products);
t("round-trip: order number", back.orderNumber === order.orderNumber);
t("round-trip: arabic name preserved", back.customer.name === "سارة أحمد");
t("round-trip: totals match, no warnings", back.total === order.total && warnings.length === 0);
t("code length reasonable (<600)", code.length < 600);

const tampered = { ...order, items: [{ ...items[0], price: 1 }], total: 3 };
const r2 = decodeOrder(encodeOrder(tampered), products);
t("tampered price → catalog price used", r2.order.items[0].price === 64 && r2.warnings.length >= 2);

let threw = false; try { decodeOrder("FRST1.!!!!", products); } catch { threw = true; }
t("garbage code rejected", threw);
threw = false; try { decodeOrder("FRST1." + Buffer.from(JSON.stringify({n:"FR-<img src=x>",d:"x",c:[],i:[]})).toString("base64url"), products); } catch { threw = true; }
t("invalid order number / empty items rejected", threw);

t("url: javascript: blocked", safeImageUrl("javascript:alert(1)") === null);
t("url: data: blocked", safeImageUrl("data:image/svg+xml,<svg onload=alert(1)>") === null);
t("url: http: blocked", safeImageUrl("http://x.com/a.jpg") === null);
t("url: protocol-relative blocked", safeImageUrl("//evil.com/a.jpg") === null);
t("url: credentials blocked", safeImageUrl("https://user:pw@evil.com/a.jpg") === null);
t("url: path traversal blocked", safeImageUrl("/../etc/passwd") === null);
t("url: https allowed", safeImageUrl("https://img.example.com/coat.jpg") === "https://img.example.com/coat.jpg");
t("url: local path allowed", safeImageUrl("/products/coat-1.jpg") === "/products/coat-1.jpg");

t("product: bad id rejected", sanitizeProduct({ ...products[0], id: "<script>" }) === null);
t("product: negative price rejected", sanitizeProduct({ ...products[0], price: -5 }) === null);
t("product: bad colour hex dropped", sanitizeProduct({ ...products[0], colors: [{ name: "x", hex: "red;background:url(x)" }] }).colors.length === 0);
t("product: huge name truncated", sanitizeProduct({ ...products[0], name: "A".repeat(5000) }).name.length === 80);
t("text: bidi override stripped", cleanText("abc‮def", 50) === "abcdef");

t("customer: invalid phone rejected", !validateCustomer({ name: "Al", phone: "call me", city: "Erbil", address: "street 1" }).ok);
t("customer: valid accepted", validateCustomer({ name: "Ali", phone: "07501234567", governorate: "Erbil", city: "Erbil", address: "street 1" }).ok);
t("customer: missing governorate rejected", !validateCustomer({ name: "Ali", phone: "07501234567", city: "Erbil", address: "street 1" }).ok);

t("cart: unknown product dropped", sanitizeCart([{ id: "P-9999", qty: 1 }], products).length === 0);
t("cart: qty clamped to stock", sanitizeCart([{ id: "P-1012", qty: 20, size: "M", color: "Oat" }], products)[0].qty === 3);
t("cart: invalid size dropped", sanitizeCart([{ id: "P-1001", qty: 1, size: "XXXL", color: "Camel" }], products).length === 0);
t("cart: negative qty dropped", sanitizeCart([{ id: "P-1001", qty: -3, size: "M", color: "Camel" }], products).length === 0);

const ids = new Set(Array.from({ length: 5000 }, () => uid("FR")));
t("order numbers unique over 5000 draws", ids.size === 5000);
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);

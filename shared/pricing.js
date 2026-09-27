import { STORE } from "./store.js";

export function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

export function shippingFor(subtotal, lineCount) {
  if (lineCount === 0) return 0;
  return subtotal >= STORE.freeShippingThreshold ? 0 : STORE.shippingFlat;
}

// lines: [{ price, qty }]
export function computeTotals(lines) {
  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.qty, 0));
  const shipping = round2(shippingFor(subtotal, lines.length));
  return { subtotal, shipping, total: round2(subtotal + shipping) };
}

import { STORE } from "../config.js";

const currencyFormat = new Intl.NumberFormat(STORE.currency.locale, {
  style: "currency",
  currency: STORE.currency.code,
});

export function money(n) {
  const v = Number(n);
  return currencyFormat.format(Number.isFinite(v) ? v : 0);
}

export function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

// Unambiguous characters only (no 0/O, 1/I/L) so order numbers are easy to
// read back over WhatsApp.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// Cryptographically random code. Rejection sampling avoids modulo bias,
// so order numbers can't be guessed or enumerated.
export function randomCode(length = 8) {
  const limit = 256 - (256 % ALPHABET.length);
  let out = "";
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of bytes) {
      if (b < limit && out.length < length) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

// uid("FR") -> "FR-7K2Q9MXA"
export function uid(prefix, length = 8) {
  return `${prefix}-${randomCode(length)}`;
}

export function cartKey(id, size, color) {
  return [id, size || "", color || ""].join("|");
}

export function shippingFor(subtotal, itemCount) {
  if (itemCount === 0) return 0;
  return subtotal >= STORE.freeShippingThreshold ? 0 : STORE.shippingFlat;
}

export function computeTotals(lines) {
  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.qty, 0));
  const shipping = round2(shippingFor(subtotal, lines.length));
  return { subtotal, shipping, total: round2(subtotal + shipping) };
}

export function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function isValidWhatsAppNumber(n) {
  return /^[1-9]\d{7,14}$/.test(n) && !/^0+$/.test(n);
}

export function whatsappLink(text) {
  return `https://wa.me/${STORE.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

export function instagramLink() {
  return STORE.instagram ? `https://instagram.com/${encodeURIComponent(STORE.instagram)}` : "";
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

import { STORE } from "../config.js";
export { round2, shippingFor, computeTotals } from "../../shared/pricing.js";

const currencyFormat = new Intl.NumberFormat(STORE.currency.locale, {
  style: "currency",
  currency: STORE.currency.code,
});

export function money(n) {
  const v = Number(n);
  return currencyFormat.format(Number.isFinite(v) ? v : 0);
}

export const moneyWhole = (n) =>
  new Intl.NumberFormat(STORE.currency.locale, { style: "currency", currency: STORE.currency.code, maximumFractionDigits: 0 }).format(n);

export function cartKey(id, size, color) {
  return [id, size || "", color || ""].join("|");
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

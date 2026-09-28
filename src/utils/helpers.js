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

// Opens WhatsApp straight into a chat with the shop (the app on phones,
// WhatsApp Web/Desktop on computers). Optional pre-typed message.
export function whatsappLink(text) {
  return `https://wa.me/${STORE.whatsappNumber}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

// Copy text to the clipboard. The modern Clipboard API only works on https
// (or localhost); on plain http — e.g. testing on a phone over Wi-Fi — fall
// back to the classic select-and-copy method. Resolves true on success.
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the fallback */
  }
  const prev = document.activeElement;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    ta.style.fontSize = "16px"; // stops iPhones zooming in
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length); // iOS needs an explicit range
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  } finally {
    prev?.focus?.({ preventScroll: true });
  }
}

export function instagramLink() {
  return STORE.instagram ? `https://instagram.com/${encodeURIComponent(STORE.instagram)}` : "";
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

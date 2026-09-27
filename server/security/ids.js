import { randomBytes, randomInt, createHash, timingSafeEqual } from "node:crypto";

// Unambiguous characters (no 0/O, 1/I/L) — easy to read out over WhatsApp.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// Cryptographically random, unbiased code.
export function randomCode(length) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export const sha256 = (s) => createHash("sha256").update(String(s)).digest("hex");

export function safeEqualHex(a, b) {
  const x = Buffer.from(String(a), "hex");
  const y = Buffer.from(String(b), "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

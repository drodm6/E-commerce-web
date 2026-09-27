// Time-based one-time passwords (RFC 6238) for two-factor login — works with
// Google Authenticator, Microsoft Authenticator, Authy, 1Password, etc.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;

export function generateSecret(bytes = 20) {
  const buf = randomBytes(bytes);
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/[\s=]/g, "");
  let bits = "";
  for (const ch of clean) {
    const v = B32.indexOf(ch);
    if (v < 0) throw new Error("Invalid base32 secret");
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export const isValidTotpSecret = (s) => {
  try {
    return base32Decode(s).length >= 16;
  } catch {
    return false;
  }
};

export function totpAt(secret, step) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const code = (mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

// Returns the matched time step (allowing ±1 step of clock drift), or null.
// Codes from a step at or before `lastUsedStep` are refused (no replay).
export function verifyTotp(secret, code, { lastUsedStep = -1, now = Date.now() } = {}) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code) || !isValidTotpSecret(secret)) return null;
  const step = currentStep(now);
  for (const s of [step - 1, step, step + 1]) {
    if (s <= lastUsedStep) continue;
    if (timingSafeEqual(Buffer.from(totpAt(secret, s)), Buffer.from(code))) return s;
  }
  return null;
}

export function otpauthUrl(secret, account = "admin", issuer = "Frost") {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}

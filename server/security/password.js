// Password hashing with scrypt (memory-hard; OWASP Password Storage Cheat
// Sheet parameters N=2^17, r=8, p=1). Built into Node — no native addons.

import { scrypt as scryptCb, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const PARAMS = { N: 2 ** 17, r: 8, p: 1 };
const KEYLEN = 32;
const MAXMEM = 256 * 1024 * 1024;
export const MAX_PASSWORD_LENGTH = 256;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { ...PARAMS, maxmem: MAXMEM });
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join(":");
}

function parse(stored) {
  const parts = String(stored || "").split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (![N, r, p].every(Number.isInteger) || N < 2 ** 14 || N > 2 ** 20 || r < 1 || r > 32 || p < 1 || p > 16) return null;
  const salt = Buffer.from(parts[4], "base64");
  const key = Buffer.from(parts[5], "base64");
  if (salt.length < 16 || key.length < 32) return null;
  return { N, r, p, salt, key };
}

export const isValidPasswordHash = (stored) => parse(stored) !== null;

// Constant-time comparison. Always runs scrypt, even for a bad stored hash,
// so response time doesn't reveal configuration details.
export async function verifyPassword(password, stored) {
  const parsed = parse(stored) || { ...PARAMS, salt: randomBytes(16), key: randomBytes(KEYLEN), dummy: true };
  const pw = typeof password === "string" ? password.slice(0, MAX_PASSWORD_LENGTH) : "";
  const key = await scrypt(pw.normalize("NFKC"), parsed.salt, parsed.key.length, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
    maxmem: MAXMEM,
  });
  return timingSafeEqual(key, parsed.key) && !parsed.dummy && typeof password === "string" && password.length > 0 && password.length <= MAX_PASSWORD_LENGTH;
}

// Basic strength rules for the setup script (OWASP ASVS: length over complexity).
export function passwordProblems(pw) {
  const out = [];
  if (pw.length < 12) out.push("use at least 12 characters");
  if (pw.length > 128) out.push("use at most 128 characters");
  const lower = pw.toLowerCase();
  if (["password", "admin", "frost", "dabo", "123456", "qwerty", "letmein", "welcome"].some((w) => lower.includes(w))) {
    out.push("avoid common words like 'password', 'admin', 'frost' or 'dabo'");
  }
  if (/^(.)\1+$/.test(pw)) out.push("don't repeat a single character");
  return out;
}

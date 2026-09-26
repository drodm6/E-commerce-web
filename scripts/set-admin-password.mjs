#!/usr/bin/env node
// Creates a salted PBKDF2-SHA256 hash of your admin password and saves it
// to .env.local as VITE_ADMIN_PASSWORD_HASH. The password itself is never
// written anywhere.
//
//   npm run set-admin-password

import { pbkdf2Sync, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";

const ITERATIONS = 600_000; // OWASP Password Storage Cheat Sheet (PBKDF2-HMAC-SHA256)
const ENV_FILE = ".env.local";
const COMMON = ["password", "admin", "frost", "123456", "qwerty", "letmein", "welcome", "iloveyou", "abc123"];

function ask(question, hidden = true) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
        else rl.output.write("*".repeat(s.length ? 1 : 0));
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

function problems(pw) {
  const out = [];
  if (pw.length < 12) out.push("use at least 12 characters");
  if (pw.length > 128) out.push("use at most 128 characters");
  const lower = pw.toLowerCase();
  if (COMMON.some((w) => lower.includes(w))) out.push("avoid common words like 'password', 'admin' or 'frost'");
  if (/^(.)\1+$/.test(pw)) out.push("don't repeat a single character");
  return out;
}

const pw = await ask("New admin password (min 12 characters): ");
const issues = problems(pw);
if (issues.length) {
  console.error(`\n✗ Weak password — please ${issues.join(", ")}.\n  Tip: a short sentence works well, e.g. "warm coats ship by sea 2026".`);
  process.exit(1);
}
const again = await ask("Repeat password: ");
if (again !== pw) {
  console.error("\n✗ Passwords don't match.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(pw, salt, ITERATIONS, 32, "sha256");
const value = `pbkdf2-sha256:${ITERATIONS}:${salt.toString("base64")}:${hash.toString("base64")}`;

let env = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
env = env.replace(/^VITE_ADMIN_PASSWORD_HASH=.*\n?/m, "");
if (env && !env.endsWith("\n")) env += "\n";
env += `VITE_ADMIN_PASSWORD_HASH=${value}\n`;
writeFileSync(ENV_FILE, env, { mode: 0o600 });

console.log(`\n✓ Saved to ${ENV_FILE} (not committed to git).`);
console.log("  Restart `npm run dev` for it to take effect.");
console.log("  When deploying, add this environment variable to your host (Netlify/Vercel/Cloudflare):\n");
console.log(`  VITE_ADMIN_PASSWORD_HASH=${value}\n`);

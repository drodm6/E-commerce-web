#!/usr/bin/env node
// Sets up admin sign-in:  npm run setup-admin
//   1. choose a strong password (stored only as a scrypt hash)
//   2. scan a QR code with an authenticator app (2FA)
//   3. a random session-signing secret is generated
// Everything is written to server/.env (never committed to git).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { ENV_FILE } from "../config.js";
import { hashPassword, passwordProblems } from "../security/password.js";
import { generateSecret, otpauthUrl, verifyTotp } from "../security/totp.js";

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => rl.output.write(s.includes(question) ? s : s.length ? "*" : "");
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

function setEnv(values) {
  let text = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  for (const [k, v] of Object.entries(values)) {
    const line = `${k}=${v}`;
    const re = new RegExp(`^${k}=.*$`, "m");
    text = re.test(text) ? text.replace(re, line) : `${text}${text && !text.endsWith("\n") ? "\n" : ""}${line}\n`;
  }
  writeFileSync(ENV_FILE, text, { mode: 0o600 });
}

console.log("\n❄  Frost admin setup\n");

const pw = await ask("New admin password (min 12 characters): ", true);
const issues = passwordProblems(pw);
if (issues.length) {
  console.error(`\n✗ Weak password — please ${issues.join(", ")}.\n  Tip: a short sentence works well, e.g. "warm coats ship by sea 2026".`);
  process.exit(1);
}
if ((await ask("Repeat password: ", true)) !== pw) {
  console.error("\n✗ Passwords don't match.");
  process.exit(1);
}

const secret = generateSecret();
const url = otpauthUrl(secret);
console.log("\nScan this QR code with Google Authenticator / Microsoft Authenticator / Authy:\n");
console.log(await QRCode.toString(url, { type: "terminal", small: true }));
console.log(`Can't scan? Add it manually with this key: ${secret.match(/.{1,4}/g).join(" ")}\n`);

let confirmed = false;
for (let attempt = 0; attempt < 3 && !confirmed; attempt++) {
  const code = (await ask("Enter the 6-digit code shown in the app: ")).replace(/\s/g, "");
  confirmed = verifyTotp(secret, code) !== null;
  if (!confirmed) console.log("✗ That code doesn't match — check the app and try again.");
}
if (!confirmed) {
  console.error("\n✗ Setup cancelled. Nothing was saved.");
  process.exit(1);
}

setEnv({
  ADMIN_PASSWORD_HASH: await hashPassword(pw),
  ADMIN_TOTP_SECRET: secret,
  JWT_SECRET: randomBytes(48).toString("base64url"), // rotating this signs everyone out
});

console.log(`\n✓ Saved to server/.env — restart the server to use it.`);
console.log("  Sign in at  https://your-site/#dabo  with your password + the code from the app.");
console.log("  When deploying, copy the three values from server/.env into your host's environment variables.\n");

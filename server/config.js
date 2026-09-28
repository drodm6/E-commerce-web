// Server configuration, read from environment variables (server/.env).
// Run `npm run setup-admin` to create server/.env with your admin password
// hash, 2FA secret and session secret.

import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "..");
export const ENV_FILE = path.join(here, ".env");

export function loadConfig(overrides = {}) {
  if (!overrides.skipEnvFile && existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  const env = { ...process.env, ...overrides.env };
  const production = env.NODE_ENV === "production";

  let jwtSecret = env.JWT_SECRET || "";
  if (jwtSecret.length < 32) {
    if (production) throw new Error("JWT_SECRET must be set (32+ chars) in production. Run `npm run setup-admin`.");
    jwtSecret = randomBytes(48).toString("base64url"); // dev only: sessions reset on restart
  }

  return {
    production,
    port: Number(env.PORT) || 4000,
    // Kept OUTSIDE server/ on purpose: `npm run dev` watches server/ and
    // shared/ to auto-restart on code changes. SQLite writes to this file
    // (and its -wal/-shm helper files) every time the server starts, so if
    // the database lived inside a watched folder the server would see its
    // own write, restart, write again, and loop forever.
    dbPath: env.DB_PATH || path.join(ROOT, "data", "frost.db"),
    // Product photos uploaded from the dashboard. Also outside server/.
    uploadsDir: env.UPLOADS_DIR || path.join(ROOT, "data", "uploads"),
    // Number of reverse proxies in front of the server (Render, Railway, Nginx…)
    // so rate limiting sees each visitor's real IP. Production defaults to 1;
    // set TRUST_PROXY=0 if the server is exposed directly to the internet.
    trustProxy: env.TRUST_PROXY !== undefined && env.TRUST_PROXY !== "" ? Number(env.TRUST_PROXY) || 0 : production ? 1 : 0,
    // Extra allowed origins for cross-origin browser requests (comma separated).
    // Leave empty when the site and API are served from the same domain.
    corsOrigins: (env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
    cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === "true" : production,
    serveStatic: env.SERVE_STATIC !== "false",
    admin: {
      passwordHash: env.ADMIN_PASSWORD_HASH || "",
      totpSecret: env.ADMIN_TOTP_SECRET || "",
      jwtSecret,
      sessionHours: 8, // absolute session lifetime
      idleMinutes: 30, // signed out after this long without activity
      maxFailures: 10, // failed logins (any IP) before the account locks
      lockMinutes: 15,
    },
    ...overrides.config,
  };
}

// Admin authentication: password (scrypt) + 6-digit authenticator code
// (TOTP 2FA) → a short-lived JWT in an httpOnly, SameSite=Strict cookie.
//
// Every JWT points at a server-side session row, so sessions can be revoked
// (sign out, "sign out everywhere") and expire after inactivity — something
// a bare JWT can't do.

import jwt from "jsonwebtoken";
import { HttpError } from "../errors.js";
import { randomToken } from "./ids.js";
import { verifyPassword, isValidPasswordHash } from "./password.js";
import { verifyTotp, isValidTotpSecret } from "./totp.js";

export const COOKIE = "frost_admin";
const JWT_OPTS = { algorithm: "HS256", issuer: "frost", audience: "frost-admin" };

export function createAuth(db, config) {
  const cfg = config.admin;
  const q = {
    insert: db.prepare("INSERT INTO sessions (id, created_at, last_seen, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)"),
    get: db.prepare("SELECT * FROM sessions WHERE id = ?"),
    touch: db.prepare("UPDATE sessions SET last_seen = ? WHERE id = ?"),
    remove: db.prepare("DELETE FROM sessions WHERE id = ?"),
    removeAll: db.prepare("DELETE FROM sessions"),
    purge: db.prepare("DELETE FROM sessions WHERE expires_at < ? OR last_seen < ?"),
    kvGet: db.prepare("SELECT value FROM kv WHERE key = ?"),
    kvSet: db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)"),
    audit: db.prepare("INSERT INTO audit_log (at, event, ip, detail) VALUES (?, ?, ?, ?)"),
    auditList: db.prepare("SELECT at, event, ip, detail FROM audit_log ORDER BY id DESC LIMIT ?"),
    auditTrim: db.prepare("DELETE FROM audit_log WHERE id NOT IN (SELECT id FROM audit_log ORDER BY id DESC LIMIT 2000)"),
  };

  const kv = (k, fallback) => {
    const row = q.kvGet.get(k);
    return row ? JSON.parse(row.value) : fallback;
  };
  const setKv = (k, v) => q.kvSet.run(k, JSON.stringify(v));

  const audit = (event, ip, detail = "") => {
    q.audit.run(new Date().toISOString(), event, String(ip || "").slice(0, 64), String(detail).slice(0, 200));
    q.auditTrim.run();
  };

  const configured = () => isValidPasswordHash(cfg.passwordHash) && isValidTotpSecret(cfg.totpSecret);

  function lockRemainingMs() {
    const g = kv("login_guard", { fails: 0, lockedUntil: 0 });
    return Math.max(0, g.lockedUntil - Date.now());
  }

  async function login({ password, code }, { ip, userAgent }) {
    if (!configured()) throw new HttpError(503, "Admin sign-in isn't set up yet. Run `npm run setup-admin` on the server.");
    const locked = lockRemainingMs();
    if (locked > 0) {
      audit("login_locked", ip);
      throw new HttpError(429, `Too many failed sign-ins. Try again in ${Math.ceil(locked / 60000)} min.`);
    }

    // Check both factors every time so timing doesn't reveal which one failed.
    const passwordOk = await verifyPassword(password, cfg.passwordHash);
    const lastStep = kv("totp_last_step", -1);
    const step = verifyTotp(cfg.totpSecret, typeof code === "string" ? code.replace(/\s/g, "") : "", { lastUsedStep: lastStep });

    if (!passwordOk || step === null) {
      const g = kv("login_guard", { fails: 0, lockedUntil: 0 });
      const fails = g.fails + 1;
      const lockedUntil = fails >= cfg.maxFailures ? Date.now() + cfg.lockMinutes * 60_000 : g.lockedUntil;
      setKv("login_guard", { fails: fails >= cfg.maxFailures ? 0 : fails, lockedUntil });
      audit("login_failed", ip, fails >= cfg.maxFailures ? "account locked" : "");
      throw new HttpError(401, "Wrong password or code.");
    }

    setKv("totp_last_step", step); // each code works only once
    setKv("login_guard", { fails: 0, lockedUntil: 0 });

    const now = Date.now();
    q.purge.run(now, now - cfg.idleMinutes * 60_000);
    const sid = randomToken(32);
    const expiresAt = now + cfg.sessionHours * 3_600_000;
    q.insert.run(sid, now, now, expiresAt, String(ip || "").slice(0, 64), String(userAgent || "").slice(0, 200));
    audit("login_success", ip);

    const token = jwt.sign({ sid }, cfg.jwtSecret, { ...JWT_OPTS, subject: "admin", expiresIn: `${cfg.sessionHours}h` });
    return { token, expiresAt };
  }

  // Returns the session row, or null if the token is missing/invalid/expired.
  function verify(token) {
    if (!token || typeof token !== "string" || token.length > 2000) return null;
    let payload;
    try {
      payload = jwt.verify(token, cfg.jwtSecret, { algorithms: ["HS256"], issuer: JWT_OPTS.issuer, audience: JWT_OPTS.audience, subject: "admin" });
    } catch {
      return null;
    }
    const s = q.get.get(payload.sid);
    const now = Date.now();
    if (!s || s.expires_at < now || s.last_seen < now - cfg.idleMinutes * 60_000) {
      if (s) q.remove.run(s.id);
      return null;
    }
    q.touch.run(now, s.id);
    return s;
  }

  return {
    configured,
    login,
    verify,
    logout: (sid) => q.remove.run(sid),
    logoutAll: () => q.removeAll.run(),
    audit,
    auditLog: (limit = 30) => q.auditList.all(limit),
    cookieOptions: () => ({
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: "strict",
      path: "/api/admin",
      maxAge: cfg.sessionHours * 3_600_000,
    }),
  };
}

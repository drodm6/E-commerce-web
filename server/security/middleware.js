import rateLimit from "express-rate-limit";
import { HttpError } from "../errors.js";
import { COOKIE } from "./auth.js";
import { IMAGE_TYPES } from "./images.js";

const tooMany = (message) => (req, res) => res.status(429).json({ error: message });

// Rate limits (per client IP). Created per app instance.
export const createLimiters = () => ({
  api: rateLimit({ windowMs: 15 * 60_000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false, handler: tooMany("Too many requests. Please slow down.") }),
  placeOrder: rateLimit({ windowMs: 60 * 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, handler: tooMany("Too many orders from this connection. Please try again later or message us on WhatsApp.") }),
  orderLookup: rateLimit({ windowMs: 15 * 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false, handler: tooMany("Too many requests.") }),
  login: rateLimit({ windowMs: 15 * 60_000, limit: 5, skipSuccessfulRequests: true, standardHeaders: "draft-8", legacyHeaders: false, handler: tooMany("Too many sign-in attempts. Wait 15 minutes and try again.") }),
  admin: rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false, handler: tooMany("Too many requests.") }),
});

// CSRF protection for state-changing requests. The admin cookie is
// SameSite=Strict, and on top of that we require a custom header — other
// websites can't add custom headers to cross-site requests without a CORS
// preflight, which this API refuses — and check the Origin when present.
export function csrfGuard(allowedOrigins) {
  return (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    if (req.get("x-frost-request") !== "1") return next(new HttpError(403, "Request blocked."));
    const origin = req.get("origin");
    if (origin && !allowedOrigins.includes(origin)) {
      // Compare hosts, not protocols: behind an HTTPS proxy the server itself sees http.
      let host = "";
      try {
        host = new URL(origin).host;
      } catch {
        /* malformed Origin → blocked below */
      }
      if (!host || host !== req.get("host")) return next(new HttpError(403, "Request blocked."));
    }
    next();
  };
}

// Only JSON bodies are accepted on write requests.
export function requireJson(req, res, next) {
  // The only non-JSON request: photo uploads (checked again on the route).
  if (req.method === "POST" && req.path === "/admin/uploads" && req.is(Object.keys(IMAGE_TYPES))) return next();
  if (["POST", "PUT", "PATCH"].includes(req.method) && !req.is("application/json")) {
    return next(new HttpError(415, "Send JSON."));
  }
  next();
}

export function requireAdmin(auth) {
  return (req, res, next) => {
    const session = auth.verify(req.cookies?.[COOKIE]);
    if (!session) {
      res.clearCookie(COOKIE, { path: "/api/admin" });
      return next(new HttpError(401, "Please sign in."));
    }
    req.session = session;
    next();
  };
}

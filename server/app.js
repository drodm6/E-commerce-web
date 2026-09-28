import express from "express";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./config.js";
import { HttpError } from "./errors.js";
import { productsRepo } from "./repos/products.js";
import { ordersRepo } from "./repos/orders.js";
import { createAuth } from "./security/auth.js";
import { createLimiters, csrfGuard, requireJson } from "./security/middleware.js";
import { publicRoutes } from "./routes/public.js";
import { adminRoutes } from "./routes/admin.js";

// Same policy as the website's <meta> CSP (vite.config.js).
const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'"],
  imgSrc: ["'self'", "https:", "data:"],
  fontSrc: ["'self'"],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  manifestSrc: ["'self'"],
  workerSrc: ["'none'"],
  upgradeInsecureRequests: [],
};

export function createApp({ config, db }) {
  const products = productsRepo(db);
  const orders = ordersRepo(db, products);
  const auth = createAuth(db, config);
  const limiters = createLimiters();
  const deps = { products, orders, auth, config, limiters };

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.set("query parser", "simple"); // no nested objects from query strings

  app.use(
    helmet({
      contentSecurityPolicy: { directives: CSP_DIRECTIVES },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "same-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xFrameOptions: { action: "deny" },
      strictTransportSecurity: config.production ? { maxAge: 63072000, includeSubDomains: true } : false,
    })
  );
  app.use(compression()); // ~3× smaller downloads on mobile data

  app.use((req, res, next) => {
    res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    next();
  });

  // CORS: only for origins you list in CORS_ORIGINS. Same-origin needs none.
  app.use("/api", (req, res, next) => {
    const origin = req.get("origin");
    if (origin && config.corsOrigins.includes(origin)) {
      res.set({
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "Content-Type, X-Frost-Request, X-Order-Token",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      });
    }
    if (req.method === "OPTIONS") return res.sendStatus(origin && config.corsOrigins.includes(origin) ? 204 : 403);
    next();
  });

  app.use(
    "/api",
    limiters.api,
    express.json({ limit: "20kb", strict: true }),
    cookieParser(),
    requireJson,
    csrfGuard(config.corsOrigins)
  );

  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.use("/api/admin", adminRoutes(deps));
  app.use("/api", publicRoutes(deps));
  app.use("/api", (req, res, next) => next(new HttpError(404, "Not found.")));

  // Uploaded product photos. Files only ever have .jpg/.png/.webp names we
  // chose, so they're always served as images, never as HTML or scripts.
  mkdirSync(config.uploadsDir, { recursive: true });
  app.use(
    "/uploads",
    express.static(config.uploadsDir, {
      dotfiles: "deny",
      index: false,
      redirect: false,
      setHeaders(res) {
        res.set({
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Security-Policy": "default-src 'none'; img-src 'self'",
        });
      },
    })
  );

  // Serve the built website (npm run build) from the same server.
  const dist = path.join(ROOT, "dist");
  if (config.serveStatic && existsSync(dist)) {
    app.use(
      express.static(dist, {
        dotfiles: "deny",
        index: "index.html",
        setHeaders(res, file) {
          res.set("Cache-Control", file.includes(`${path.sep}assets${path.sep}`) ? "public, max-age=31536000, immutable" : "no-cache");
        },
      })
    );
  }

  // Anything else: a plain 404 (never the framework's default error page).
  app.use((req, res) => res.status(404).type("text/plain").send("Not found"));

  // Errors: clean JSON, never stack traces or internals.
  app.use((err, req, res, next) => {
    let status = err instanceof HttpError ? err.status : err.status || err.statusCode || 500;
    let message = err instanceof HttpError ? err.message : "Something went wrong.";
    if (err.type === "entity.parse.failed") message = "Invalid JSON.";
    else if (err.type === "entity.too.large") message = "Request too large.";
    else if (!(err instanceof HttpError) && status < 500) message = "Bad request.";
    if (status >= 500) {
      status = 500;
      console.error(err);
    }
    if (res.headersSent) return next(err);
    res.status(status).json({ error: message, ...(err.details ? { fields: err.details } : {}) });
  });

  return app;
}

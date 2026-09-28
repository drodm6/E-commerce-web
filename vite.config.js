import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Content-Security-Policy for the production build. It only allows code,
// styles and fonts from this site itself, so injected scripts can't run
// (OWASP A03 / XSS defence-in-depth). Product photos may come from any
// https:// host. The same policy (plus frame-ancestors, which can't be set
// in a <meta> tag) is sent as a header by public/_headers and vercel.json.
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' https: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

function cspMetaTag() {
  return {
    name: "frost-csp",
    apply: "build", // dev server needs inline scripts for hot reload
    transformIndexHtml() {
      return [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" }];
    },
  };
}

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export default defineConfig({
  plugins: [react(), cspMetaTag()],
  server: {
    port: 5173,
    open: true,
    // Listen on your whole home network (0.0.0.0), not just this computer,
    // so you can open the site from your phone at http://<your-computer's-IP>:5173
    // (phone and computer must be on the same Wi-Fi). Vite prints that
    // address as "Network:" when the dev server starts.
    host: true,
    headers: securityHeaders,
    // Send /api calls to the Express server during development.
    proxy: { "/api": { target: "http://localhost:4000", changeOrigin: false }, "/uploads": { target: "http://localhost:4000", changeOrigin: false } },
  },
  preview: {
    open: false,
    host: true,
    proxy: { "/api": { target: "http://localhost:4000", changeOrigin: false }, "/uploads": { target: "http://localhost:4000", changeOrigin: false } },
    headers: { ...securityHeaders, "Content-Security-Policy": CSP + "; frame-ancestors 'none'" },
  },
  build: {
    sourcemap: false, // don't publish original source code
    assetsInlineLimit: 0, // keep fonts/images as files so CSP font-src 'self' applies cleanly
  },
});

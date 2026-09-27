// Store settings live in shared/store.js (used by both site and server).
export { STORE, GOVERNORATES } from "../shared/store.js";

// Admin panel behaviour in the browser. Real security (password, 2FA,
// lockout, sessions) is enforced by the server — see server/.
export const ADMIN = {
  // The panel's secret address: https://your-site/#dabo
  route: "#dabo",
  // Warn and sign out after this many minutes without activity.
  idleMinutes: 30,
};

// ─────────────────────────────────────────────────────────────
//  FROST — store settings
//  Everything you normally need to change lives in this file.
// ─────────────────────────────────────────────────────────────

export const STORE = {
  name: "Frost",
  tagline: "Winter wear, layered right",

  // WhatsApp number that customers send their receipt screenshot to.
  // International format, DIGITS ONLY: no "+", no "00", no spaces.
  //   ✅ "9647501234567"     ❌ "+964 750 123 4567"
  whatsappNumber: "0000000000",

  // Instagram handle without the "@". Leave "" to hide Instagram links.
  instagram: "frost.store",

  // Currency used for all prices.
  currency: { code: "USD", locale: "en-US" },

  // Delivery charge, and the subtotal above which delivery is free.
  shippingFlat: 4.99,
  freeShippingThreshold: 80,

  // Shown to customers: how long a pre-order takes to arrive.
  deliveryEstimate: "3–5 weeks",

  // How many confirmed orders you collect before placing one combined
  // supplier order (shipped by sea). Used by the admin "Batch" tab.
  batchTarget: 20,
};

// The admin password is NOT set here. Run `npm run set-admin-password`,
// which stores a salted hash in .env.local (VITE_ADMIN_PASSWORD_HASH).
export const ADMIN = {
  // Signed out automatically after this many minutes without activity.
  idleMinutes: 15,

  // Failed attempts allowed before the login is temporarily locked.
  maxAttempts: 5,
  lockoutMinutes: 5,
};

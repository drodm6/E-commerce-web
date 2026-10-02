// ─────────────────────────────────────────────────────────────
//  FROST — store settings (shared by the website and the server)
//  Everything you normally need to change lives in this file.
// ─────────────────────────────────────────────────────────────

export const STORE = {
  name: "Frost",
  tagline: "Winter wear, layered right",

  // WhatsApp number that customers send their receipt screenshot to.
  // International format, DIGITS ONLY: no "+", no "00", no spaces.
  //   ✅ "9647501234567"     ❌ "+964 750 123 4567"
  whatsappNumber: "9647509225927",
  // How the number is shown to customers.
  whatsappDisplay: "0750 922 5927",

  // Instagram handle without the "@". Leave "" to hide Instagram links.
  instagram: "frost.store",

  // Currency used for all prices.
  currency: { code: "USD", locale: "en-US" },

  // Delivery charge, and the subtotal from which delivery is free.
  shippingFlat: 4.99,
  // Share of the total the customer pays online to register the order (%).
  // The rest is paid when the order arrives.
  depositPercent: 50,
  freeShippingThreshold: 99,

  // Where you deliver (shown to customers).
  deliveryArea: "all of Iraq & Kurdistan",

  // Shown to customers: how long a pre-order takes to arrive.
  deliveryEstimate: "3–5 weeks",

  // How many confirmed orders you collect before placing one combined
  // supplier order (shipped by sea or air). Used by the admin "Batch" tab.
  batchTarget: 20,
};

// Governorates we deliver to — every governorate of Iraq, including the
// Kurdistan Region. Checkout only accepts values from this list.
export const GOVERNORATES = [
  "Erbil",
  "Sulaymaniyah",
  "Duhok",
  "Halabja",
  "Baghdad",
  "Basra",
  "Mosul",
  "Nineveh",
  "Kirkuk",
  "Anbar",
  "Babil",
  "Karbala",
  "Najaf",
  "Diyala",
  "Saladin",
  "Wasit",
  "Maysan",
  "Dhi Qar",
  "Muthanna",
  "Al-Qadisiyyah",
];

# Zonlet — React Shopping Site

A responsive, Amazon-style storefront built with React + Vite. Black theme,
per-product cart, cash-on-delivery checkout with a receipt screen, and a
hidden admin panel for managing products.

## Project structure

```
zonlet-shop/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx            # React entry point
│   ├── App.jsx              # Main app logic (routing, cart, checkout)
│   ├── App.css
│   ├── index.css            # Design tokens + shared button/table styles
│   ├── data/
│   │   └── defaultProducts.js   # Seed product objects
│   ├── utils/
│   │   ├── storage.js       # localStorage persistence helpers
│   │   └── helpers.js       # uid(), money(), constants
│   └── components/
│       ├── Header.jsx / .css
│       ├── ProductGrid.jsx
│       ├── ProductCard.jsx / .css
│       ├── CartDrawer.jsx / .css
│       ├── ReceiptModal.jsx / .css
│       └── AdminPanel.jsx / .css
```

## Getting started

1. Install [Node.js](https://nodejs.org) (v18+) if you don't have it.
2. In this folder, install dependencies:
   ```
   npm install
   ```
3. Run the dev server:
   ```
   npm run dev
   ```
4. Open the URL it prints (usually `http://localhost:5173`).

To build for production: `npm run build` (output goes to `dist/`), then
`npm run preview` to test the production build locally.

## How it works

- **Products** are plain JS objects, each with a unique `id` (e.g. `P-1001`),
  used for cart lookups, receipt line items, and admin editing. Seed data
  lives in `src/data/defaultProducts.js`.
- **Cart** state lives in `App.jsx` and is mirrored into `localStorage`
  (`src/utils/storage.js`) so it survives a page refresh.
- **Checkout**: clicking "I Agree — Place Order" in the cart generates a
  unique order number (`uid("ORD")` in `src/utils/helpers.js`), saves the
  order, and opens `ReceiptModal` with the itemized total, an instruction to
  screenshot the receipt, and a WhatsApp number to send it to.
- **Admin panel**: not linked anywhere in the UI. Visit `/#admin` in the
  browser to reach it. It's gated by a plain password check
  (`ADMIN_PASSWORD` in `src/utils/helpers.js`, default `admin123` —
  **change this**). From there you can add, edit, or delete products, and
  view every order that's been placed.

## Things to change before real use

- `src/utils/helpers.js`:
  - `WHATSAPP_NUMBER` — the number customers send their receipt to
  - `ADMIN_PASSWORD` — change from the default
  - `SHIPPING_FLAT` / `FREE_SHIP_THRESHOLD` — shipping cost rules
- Product images: cards currently use emoji placeholders (`emoji` field on
  each product). Swap in real `<img>` tags if you have product photos.

## Important limitation: this uses localStorage

Cart, product catalog edits, and orders are stored in the browser's
`localStorage`. That means:

- Data is per-browser/per-device — if you edit products in the admin panel
  on your laptop, a customer opening the site on their own phone **won't**
  see those changes, because they have their own separate localStorage.
- Clearing browser data wipes everything.

This is fine for a prototype, personal use, or a kiosk running on one
device. For a real multi-customer storefront where the admin's product
changes and order history need to be shared across everyone, you'll need a
real backend (a database + API) instead of localStorage — happy to help
you plan that next step if you want to take this further.

Also note: the admin password is a plain client-side check, visible to
anyone who reads the JavaScript source. It's a basic deterrent, not real
security — don't rely on it to protect anything sensitive.

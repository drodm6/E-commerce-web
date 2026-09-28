# Frost — Winter Clothing Shop

An online shop for a small winter clothing business, with a **React** website
and a **Node.js + Express** backend. Customers browse, choose sizes and colours,
and place a cash-on-delivery order. They then send their receipt screenshot on
**WhatsApp**. You manage everything from a private, secured dashboard.

- 🚚 **Free delivery to your door on orders over $80**
- 📍 **Delivery to all of Iraq & Kurdistan** (every governorate)
- 💵 **Cash on delivery** · pre-orders shipped together by sea

---

## How the business flow works

1. A customer picks pieces, chooses their **governorate**, city and address, and places the order.
2. The **server** checks stock, sets the real prices and saves the order. The customer gets a receipt with a unique order number.
3. They **screenshot the receipt and send it to you on WhatsApp**. The message is pre-written.
4. In your dashboard, go to **Orders → Check a WhatsApp receipt** and type the order number from the screenshot.
   You see the real order — customer, phone, full address, every item with size, colour and price, and the total — so you can confirm the screenshot matches.
   Then click **"Receipt matches — confirm order"**.
5. **Batch & supplier** adds up all confirmed orders into one shopping list for your supplier. You order everything together and ship it by sea.
6. You deliver and collect the cash.

---

## Screenshots

<table>
  <tr>
    <td width="50%" valign="top"><img src="screenshots/home.png" alt="Home page" /><p align="center"><em>Home: delivery promises up front</em></p></td>
    <td width="50%" valign="top"><img src="screenshots/shop.png" alt="Product grid" /><p align="center"><em>Clean, light product grid</em></p></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="screenshots/product.png" alt="Product details" /><p align="center"><em>Product view: colours, sizes, size guide, delivery info</em></p></td>
    <td width="50%" valign="top"><img src="screenshots/receipt.png" alt="Receipt" /><p align="center"><em>Receipt to screenshot and send on WhatsApp</em></p></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="screenshots/admin-order-detail.png" alt="Order detail in the dashboard" /><p align="center"><em>Dashboard: full order detail to check a receipt</em></p></td>
    <td width="50%" valign="top"><img src="screenshots/admin-login.png" alt="Dashboard sign-in" /><p align="center"><em>Sign-in with password + authenticator code</em></p></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><img src="screenshots/admin-overview.png" alt="Dashboard overview" /><p align="center"><em>Overview, security checks and activity log</em></p></td>
    <td width="50%" valign="top"><img src="screenshots/admin-batch.png" alt="Batch and supplier list" /><p align="center"><em>Batch progress and supplier shopping list</em></p></td>
  </tr>
</table>

---

## Getting started

You need [Node.js](https://nodejs.org) **20.19 or newer**.

```bash
npm install          # once
npm run setup-admin  # once: set your dashboard password + authenticator app
npm run dev          # starts the website AND the API together
```

- **Shop:** http://localhost:5173
- **Dashboard:** http://localhost:5173/#dabo — the address is secret and not linked anywhere. `#admin` does nothing.

### Setting up your dashboard sign-in (`npm run setup-admin`)

1. Choose a password (at least 12 characters; a short sentence works well).
2. A **QR code** appears in the terminal. Scan it with **Google Authenticator**, **Microsoft Authenticator** or **Authy** on your phone.
3. Type the 6-digit code the app shows to confirm.

Every sign-in then needs your **password + the current 6-digit code** from your phone.
Someone who learns your password still can't get in without your phone.

The script saves your settings to `server/.env`. This file stores only a hash of
your password, never the password itself, and git ignores it.

### Store settings — `shared/store.js`

| Setting | What it does |
|---|---|
| `whatsappNumber` | Your WhatsApp number, **digits only in international format** (set to `9647509225927`) |
| `whatsappDisplay` | How the number is shown to customers (`0750 922 5927`) |
| `instagram` | Your Instagram handle without `@` |
| `shippingFlat` / `freeShippingThreshold` | Delivery charge, and the order amount from which delivery is free (**80**) |
| `deliveryArea` | Shown to customers ("all of Iraq & Kurdistan") |
| `deliveryEstimate` | e.g. `"3–5 weeks"` |
| `batchTarget` | How many confirmed orders you want before placing a supplier order |

The list of governorates customers can choose from is `GOVERNORATES` in the same file.

---

## The dashboard (`#dabo`)

- **Overview:** new orders, money to collect, batch progress, stock alerts, security checks and an **activity log** of sign-ins (including failed attempts) and changes.
- **Orders:** every order appears the moment a customer places it. You can:
  - **Check a WhatsApp receipt** by order number. If the number doesn't exist, the screenshot is fake or edited.
  - Open **full details**: customer name, phone (tap to call or WhatsApp), governorate, city, address, note, every item with product ID, size, colour, quantity and price, the total to collect, the status timeline, a private note, and the customer's other orders.
  - Change status (New → Confirmed → Ordered from supplier → Shipping by sea → Arrived → Delivered, or Cancelled). Cancelling puts the items back in stock.
  - Search by order number, name, phone, city or address, and export CSV.
- **Products:** add, edit, duplicate and delete. Changes are **live on the shop immediately**. You can also back up or import the catalog as JSON.
- **Photos:** each product can have **1 to 5 photos**. In the product editor, tap **Upload photos** and pick them from your phone or computer. They're shrunk automatically before upload, so large phone photos are fine. Use the ← → buttons to reorder: the first photo is the main one shown on the product card. You can also paste an `https://` photo link instead. Uploaded photos are saved in `data/uploads/`, next to the database, so back up the whole `data/` folder.
- **Batch & supplier:** a combined shopping list of all confirmed orders, and buttons to move orders through the shipping stages.

---

## API

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/products` | public | Catalog |
| GET | `/api/products/:id` | public | One product |
| POST | `/api/orders` | public | Place an order (server sets prices and checks stock) |
| GET | `/api/orders/:orderNumber` | customer | Their receipt, needs the secret `X-Order-Token` from checkout |
| POST | `/api/admin/login` | — | Password + 6-digit code → session cookie |
| GET | `/api/admin/me` · POST `/logout` · `/logout-all` | admin | Session |
| GET/POST/PUT/DELETE | `/api/admin/products[/:id]` | admin | Manage products |
| GET | `/api/admin/orders?status=&q=` | admin | List and search orders |
| GET/PATCH/DELETE | `/api/admin/orders/:orderNumber` | admin | Full detail, update status/note, delete |
| GET | `/api/admin/audit` | admin | Activity log |

Errors are always JSON: `{ "error": "message", "fields": { … } }`.

---

## Deploying

**Step-by-step guide for going live at frostshop.store: see [DEPLOY.md](DEPLOY.md)**
(hosting, domain, DNS, backups, updates).

The site and API run as **one Node.js app** (the server also serves the built
website). Use a host that runs Node and gives you a **persistent disk** for the
database, e.g. Render, Railway, Fly.io or a small VPS.

```bash
npm install
npm run build        # builds the website into dist/
npm start            # serves website + API on $PORT (default 4000)
```

Set these environment variables on your host. The first three come from your `server/.env`:

| Variable | Value |
|---|---|
| `ADMIN_PASSWORD_HASH` | from `server/.env` |
| `ADMIN_TOTP_SECRET` | from `server/.env` |
| `JWT_SECRET` | from `server/.env` (required in production) |
| `NODE_ENV` | `production` |
| `DB_PATH` | a file on the persistent disk, e.g. `/var/data/frost.db` |
| `TRUST_PROXY` | `1` (default in production). Set `0` only if nothing sits in front of the server. |

Always use **HTTPS**. The database is a single file; copy `DB_PATH` regularly as a backup.

---

## Security

Built and checked against the **OWASP Top 10** and OWASP cheat sheets. Run the
28 automated security and API tests with `npm test`.

| Area | What's in place |
|---|---|
| **Authentication (A07)** | Password hashed with **scrypt** plus **two-factor codes** (TOTP, RFC 6238), and each code works only once. Constant-time checks. No default password. **Account lock** after 10 failed sign-ins (15 min). Every sign-in and failure is logged. |
| **Sessions** | Signed **JWT** (HS256, algorithm pinned, issuer/audience checked) in an **httpOnly, SameSite=Strict** cookie scoped to `/api/admin`, so JavaScript can't read it. Each JWT is tied to a server-side session, so **sign-out really revokes it**, including "sign out on every device". 30-minute idle timeout and 8-hour maximum. |
| **Hidden dashboard** | Moved from `#admin` to `#dabo`, not linked anywhere, and `noindex`. This is only a first layer: every admin API call is blocked without a valid signed-in session. |
| **Rate limiting** | Sign-in: 5 failed attempts per 15 min per IP. Orders: 10 per hour per IP. Receipt lookups: 60 per 15 min. Admin API: 120 per minute. Whole API: 300 per 15 min. |
| **Injection & XSS (A03)** | Every input is validated on the server with the same shared rules as the website (types, lengths, allowed values, governorate list). All SQL uses **bound parameters**. React escapes all output. Strict **Content-Security-Policy**: scripts, styles and fonts only from this site; no inline scripts, no framing. |
| **IDOR (A01)** | Knowing an order number is not enough to see an order. Customers need the secret receipt token given at checkout, and every other case returns the same "not found". Admin routes validate IDs and require a session. |
| **Photo uploads** | Only for signed-in admins. The real file type is checked from the file's bytes (JPEG, PNG or WebP only, never SVG or HTML). Max 5 MB. Files get random names chosen by the server and are served with `nosniff` and a locked-down Content-Security-Policy. |
| **SSRF** | The server **never fetches URLs** supplied by users. Product photo links must be `https://` or a site path; `javascript:`, `data:`, `file:`, `http:`, internal addresses and `//` tricks are rejected. |
| **Price tampering (A04)** | The browser only sends product IDs, sizes, colours and quantities. The server looks up prices, computes totals and checks stock inside a database transaction (no overselling). |
| **CSRF** | SameSite=Strict cookie, a required custom request header, and an Origin check. Cross-site preflights are refused, and only JSON bodies are accepted. |
| **Headers (A05)** | Helmet: CSP, HSTS (production), `X-Frame-Options: DENY`, `nosniff`, strict Referrer-Policy, COOP/CORP and Permissions-Policy. No `X-Powered-By`, no stack traces in responses, 20 KB body limit. |
| **Other** | Mass-assignment protection (whitelisted fields only), parameter and prototype pollution tests, a hidden anti-bot form field, `no-store` on personal data, CSV-injection-safe exports, crypto-random order numbers, `npm audit` reporting **0 vulnerabilities**. |

---

## Project structure

```
├── shared/                  # used by BOTH website and server
│   ├── store.js             # ← store settings, governorates
│   ├── validate.js          # all validation rules
│   └── pricing.js           # totals & free-delivery rule
├── server/
│   ├── index.js             # starts the server
│   ├── app.js               # Express app: security middleware + routes
│   ├── config.js            # environment variables
│   ├── db.js                # SQLite schema (seeded from src/data/products.json)
│   ├── routes/              # public.js, admin.js
│   ├── repos/               # products.js, orders.js (data access)
│   ├── security/            # auth (JWT sessions), password, totp, rate limits, CSRF
│   └── scripts/setup-admin.js
├── src/                     # React website
│   ├── api.js               # API client
│   ├── Storefront.jsx       # shop, bag, checkout
│   ├── components/          # Header, Hero, ProductModal, CartDrawer, ReceiptModal…
│   └── admin/               # dashboard (#dabo)
├── tests/                   # npm test
└── scripts/dev.mjs          # npm run dev
```

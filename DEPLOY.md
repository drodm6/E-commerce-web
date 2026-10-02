# Putting Frost online at frostshop.store

This guide takes you from "it runs on my computer" to a live shop at
**https://frostshop.store**. Once it's set up, every `git push` to the
`full-app` branch updates the live site automatically.

Prices below are approximate. Always check the current price on each
website before paying.

---

## Before you start: checklist

- [ ] **Your Instagram handle.** Open `shared/store.js` and set `instagram:` to your real handle (without `@`). It is currently a placeholder, `frost.store`.
- [ ] **Your WhatsApp number** is already set to `0750 922 5927`.
- [ ] **Prices and delivery** in `shared/store.js`: currency (USD), delivery charge (`shippingFlat`), free delivery from $99, delivery time.
- [ ] **Admin sign-in:** you have run `npm run setup-admin` on your computer and can sign in at `/#dabo` with your password + authenticator code.
- [ ] **A payment card** that works online (Visa/Mastercard, a virtual card works too), for the hosting and the domain.
- [ ] **Push your latest changes** to GitHub (`git push`).

The 12 starter products are only examples. After launch, delete or edit
them in the dashboard and add your real products with photos.

---

## Which hosting to choose

The shop needs a host that runs **Node.js** and keeps files (your orders
database and photos) on a **persistent disk**.

| | **Option A: Railway** (recommended) | **Option B: your own small server (VPS)** |
|---|---|---|
| Cost | about **$5/month** | about **€4–6/month** (e.g. Hetzner) |
| Difficulty | Easy: all clicks, no server to manage | Harder: you type commands on a Linux server |
| Updates | Automatic on every `git push` | You run 3 commands |
| HTTPS | Automatic | Automatic (Caddy) |

**Recommendation: Option A (Railway).** It connects to your GitHub, updates
itself when you push, and there's nothing to maintain.

---

## Option A: Railway (recommended)

### 1. Create the project

1. Go to **railway.com** and **sign up with GitHub**.
2. Choose the **Hobby** plan and add your card.
3. Click **New Project → Deploy from GitHub repo**. Allow access to `drodm6/E-commerce-web` and select it.
4. Open the new service → **Settings → Source**, and set the branch to **`full-app`**.
   (The repo already contains `railway.json`, which tells Railway how to build and start the shop.)

### 2. Add a disk for orders and photos

Without this step, **every update would erase your orders and photos**.

1. In the project, click the service → **Add Volume** (or right-click the canvas → *Volume*).
2. Set **Mount path** to: `/data`

### 3. Add your settings (Variables)

Open the service → **Variables** → add each one:

| Name | Value |
|---|---|
| `DB_PATH` | `/data/frost.db` |
| `UPLOADS_DIR` | `/data/uploads` |
| `ADMIN_PASSWORD_HASH` | copy from your computer's `server/.env` |
| `ADMIN_TOTP_SECRET` | copy from your computer's `server/.env` |
| `JWT_SECRET` | copy from your computer's `server/.env` |

To see those three values, open `server/.env` on your computer in any text
editor (Notepad is fine). Copy **everything after the `=`** on each line.

These are your keys. Only ever paste them into Railway's Variables page:
never into chat, email or GitHub.

Railway sets `PORT` by itself, and `npm start` always runs in production
mode, so don't add `PORT` or `NODE_ENV`.

### 4. Deploy and test

1. Railway builds and starts the shop. Open **Deployments → View logs** and wait for:
   `Frost API running on http://localhost:…`
2. Go to **Settings → Networking → Generate Domain**. You get a free test address like `frost-production.up.railway.app`.
3. Open it on your phone. Check the shop loads, then open `…/#dabo` and sign in with your password + authenticator code.
4. Place a test order, check it appears in the dashboard, then delete it.

### 5. Connect your domain frostshop.store

**Buy the domain** from a registrar such as **Porkbun**, **Namecheap** or
**Spaceship**:

- Search `frostshop.store` and buy it (1 year is enough to start).
- **Check the renewal price before paying.** `.store` domains are often cheap in the first year but can cost much more to renew.
- Say **no** to extras (email, hosting, "SSL", website builder). You don't need them; HTTPS is free on Railway.

**Point it at Railway:**

1. In Railway: service → **Settings → Networking → Custom Domain**. Add `frostshop.store`, then add `www.frostshop.store` too.
2. Railway shows you **DNS records to create** (usually a `CNAME`, sometimes also a `TXT` record for verification). Keep that page open.
3. In your registrar's **DNS settings**, create **exactly** the records Railway shows:
   - For `www`: type **CNAME**, host `www`, value = what Railway shows.
   - For the main domain (`@` / blank host): use **ALIAS** or **ANAME** if your registrar offers it (Porkbun and Namecheap do), pointing to the value Railway shows. Otherwise use CNAME if it's allowed on `@`.
   - Add any **TXT** record Railway asks for.
   - Delete any old "parking" A/CNAME records on `@` or `www` that the registrar added.
4. Wait. DNS usually works within 5–30 minutes, occasionally a few hours. Railway shows a green check and turns on **HTTPS automatically**.

If your registrar won't let you point the main domain (`@`) at Railway,
move the DNS to **Cloudflare** (free). Add the site in Cloudflare, change
the nameservers at your registrar to the two Cloudflare gives you, then
create the same records in Cloudflare with the **cloud icon set to grey
("DNS only")**.

### 6. Updating the live site later

Just push to GitHub:

```bash
git pull   # get my latest changes (if any)
git push   # if you changed something yourself
```

Railway notices the new code on `full-app` and redeploys within a
minute or two. Your orders and photos stay safe on the `/data` disk.

### 7. Backups

- Your orders and photos live on the Railway volume. If your plan offers **volume backups** (the volume's *Backups* tab), turn them on.
- In the dashboard you can also download everything yourself:
  - **Orders → Export CSV** (opens in Excel)
  - **Products → Back up (JSON)**

  Do this every week or two.

---

## Option B: your own server (VPS), cheapest over time

Choose this if you're comfortable typing commands. Example provider:
**Hetzner Cloud**, smallest shared server, Ubuntu 24.04, about €4–6/month.

On the server (connect with `ssh root@YOUR_SERVER_IP`):

```bash
# 1. Install Node 22, git and Caddy (web server with automatic HTTPS)
apt update && apt install -y git curl debian-keyring debian-archive-keyring apt-transport-https
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

# 2. A separate user for the shop (don't run it as root)
adduser --disabled-password --gecos "" frost
su - frost -c "git clone -b full-app https://github.com/drodm6/E-commerce-web.git && cd E-commerce-web && npm ci && npm run build"

# 3. Your secrets: paste the 3 lines from your computer's server/.env
nano /home/frost/E-commerce-web/server/.env
chown frost:frost /home/frost/E-commerce-web/server/.env && chmod 600 /home/frost/E-commerce-web/server/.env

# 4. Run it as a service (starts on boot, restarts on crash)
cp /home/frost/E-commerce-web/deploy/frost.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now frost

# 5. HTTPS + your domain
cp /home/frost/E-commerce-web/deploy/Caddyfile /etc/caddy/Caddyfile && systemctl reload caddy

# 6. Firewall: only web + ssh
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

**DNS for a VPS:** at your registrar, create two **A** records, `@` and
`www`, both set to your server's IP address.

**Update later:**

```bash
su - frost -c "cd E-commerce-web && git pull && npm ci && npm run build"
systemctl restart frost
```

**Backups:**

```bash
su - frost -c "cd E-commerce-web && npm run backup"
```

This saves the database and photos into `backups/`. Download that
folder to your computer from time to time.

---

## After launch: quick test on your phone

- [ ] `https://frostshop.store` loads, and the padlock shows in the address bar.
- [ ] The floating WhatsApp button opens a chat with **0750 922 5927**.
- [ ] Place a test order and check that:
  - [ ] the receipt shows your number
  - [ ] **Send on WhatsApp** opens your chat with the order already written
  - [ ] **Copy** works
- [ ] `https://frostshop.store/#dabo` → sign-in works, and the test order is there. Then delete it.
- [ ] Upload a real product photo in the dashboard, and check it shows on the shop.

**Tip:** install **WhatsApp Business** (free) on your phone for your
shop number. Customers who tap your number then see a business profile
with your logo, address and hours, and you can set up automatic replies
("Thanks! We received your receipt and will confirm soon").

---

## Security notes

- **Development mode shows your code in the browser.** When you run `npm run dev`, the browser's *Inspect* shows readable source files, including the dashboard's code. That's normal for development.
- **The live site is different.** It ships only minified files and **no source maps**. The server, database, tests and secrets are **never** served (they return 404).
- **Seeing the dashboard's code gives nothing away.** It contains **no secrets**. Every dashboard action is checked on the server and needs your password **and** your phone's code.
- **Secrets live only in host variables.** Your password hash, 2FA key and session key are never in the website's files or on GitHub.
- **The dev server is locked down on your Wi-Fi.** It refuses to hand out the database, uploads, server code or secret files to other devices.

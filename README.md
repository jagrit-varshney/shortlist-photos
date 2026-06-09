# shortlist-photos

Web app for collaboratively culling large photo collections. Built for wedding photo shortlisting — each person browses photos in a full-screen slideshow, shortlists picks into a shared list, and exports the final selection.

## Features

- Full-screen slideshow with progressive loading (thumbnail → full-res)
- Gallery grid view — browse all photos, click to open in slideshow
- Shared shortlist with per-user attribution (see who picked each photo)
- Per-user resume — pick up exactly where you left off
- Soft-delete with recoverable un-shortlisted tab
- Admin portal — create accounts, reset passwords, set album title, reset DB
- Export shortlist as CSV, plain text, or copy original files to a new folder

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- Your photos organised in subfolders on disk

### 1. Configure

```bash
cp .env.example .env
```

Edit `.env`:

```env
PHOTOS_ROOT=/absolute/path/to/your/photos   # local path to photos folder
AUTH_SECRET=<run: openssl rand -base64 32>   # random secret for sessions
DATABASE_PATH=/data/shortlist.db
THUMBNAILS_PATH=/data/thumbnails
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 2. Start

```bash
docker compose up -d
```

### 3. Create admin account

```bash
docker compose exec app npm run seed
```

Visit http://localhost:3000 and log in with the admin account.

---

## Photo Organisation

Organise photos in subfolders under `PHOTOS_ROOT`. Each subfolder becomes an album.

```
PHOTOS_ROOT/
  ceremony/
    DSC_0001.jpg
    DSC_0002.jpg
  reception/
    DSC_0500.jpg
```

Supported formats: `.jpg` `.jpeg` `.png` `.webp` `.heic` `.heif` `.tiff` `.tif` `.avif` `.gif`

Photos are scanned once on startup and cached in the SQLite DB. To re-scan after adding photos, restart the container.

---

## Sharing with Family

Three options for letting others access the app:

### Option A: Cloudflare Tunnel (recommended)

Exposes the app to the internet via Cloudflare — no port forwarding or VPN needed. Works on any device with a browser.

1. [Install cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/)
2. Start the app: `docker compose up -d`
3. In a separate terminal:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
4. Cloudflare prints a temporary `*.trycloudflare.com` URL — share it with family.
5. Update `NEXT_PUBLIC_BASE_URL` in `.env` to that URL, then `docker compose restart`.

For a permanent custom domain, [create a named tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/) and optionally add the `cloudflared` service to `docker-compose.yml`.

---

### Option B: Tailscale

Everyone joins the same private Tailscale network. No public internet exposure.

1. [Install Tailscale](https://tailscale.com/download) on your machine and each family member's device.
2. Find your machine's Tailscale IP:
   ```bash
   tailscale ip
   ```
3. Start the app: `docker compose up -d`
4. Set `NEXT_PUBLIC_BASE_URL=http://<tailscale-ip>:3000` in `.env`, then `docker compose restart`.
5. Family members open `http://<tailscale-ip>:3000` in their browser.

---

### Option C: Cloud VPS

Host on a cloud server (DigitalOcean, Hetzner, AWS, etc.) with photos uploaded there. Good if photos are already in cloud storage or you don't want to leave your own machine running.

1. Provision a VPS — 2 GB RAM minimum recommended.
2. Install Docker + Docker Compose on the server.
3. Upload photos:
   ```bash
   rsync -avz --progress ./photos/ user@your-server:/photos/
   ```
4. Clone this repo on the server and configure `.env` with `PHOTOS_ROOT=/photos`.
5. `docker compose up -d`
6. Strongly recommended: add HTTPS via a reverse proxy (nginx + Let's Encrypt / Caddy).

---

## Data Persistence

The `./data` directory (created automatically on first run) holds:
- `shortlist.db` — SQLite database (shortlist, users, progress)
- `thumbnails/` — generated thumbnail cache

**Back up `./data` regularly.** Thumbnails can be regenerated; the DB cannot.

---

## Development

```bash
npm install
cp .env.example .env.local   # fill in local paths
npm run dev                   # start dev server at localhost:3000
npm run test                  # run test suite (Vitest)
npm run seed                  # create admin account interactively
npm run build                 # production build
```

# Developer Guide — shortlist-photos

How to run the app locally for development or self-hosting.

---

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **npm** (comes with Node)
- **Docker + Docker Compose** — only needed for the Docker path

---

## Option A: Local Development (no Docker)

Best for making code changes.

### 1. Clone and install

```bash
git clone https://github.com/jagrit-varshney/shortlist-photos.git
cd shortlist-photos
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
PHOTOS_ROOT=/absolute/path/to/your/photos
AUTH_SECRET=any-random-string-at-least-32-chars
DATABASE_PATH=./data/shortlist.db
THUMBNAILS_PATH=./data/thumbnails
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

> `PHOTOS_ROOT` must be an absolute path to a folder containing your photos (or subfolders of photos). Create an empty folder if you don't have photos yet.

### 3. Create the data directory

```bash
mkdir -p data/thumbnails
```

### 4. Create the first admin account

```bash
npm run seed
```

Follow the prompts to set a name, email, and password.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the admin account.

---

## Option B: Docker (recommended for self-hosting)

### 1. Clone and configure

```bash
git clone https://github.com/jagrit-varshney/shortlist-photos.git
cd shortlist-photos
cp .env.example .env
```

Edit `.env` with the same variables as above. For Docker, use paths inside the container:

```env
PHOTOS_ROOT=/photos
DATABASE_PATH=/data/shortlist.db
THUMBNAILS_PATH=/data/thumbnails
AUTH_SECRET=<run: openssl rand -base64 32>
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

The `docker-compose.yml` mounts:
- Your local photos folder → `/photos` in the container
- `./data/` → `/data` in the container (SQLite DB + thumbnails)

Update the photos volume mount in `docker-compose.yml` to point to your local photos folder:

```yaml
volumes:
  - /your/local/photos:/photos   # ← change this
  - ./data:/data
```

### 2. Start

```bash
docker compose up -d
```

### 3. Create the first admin account

```bash
docker compose exec app npm run seed
```

### 4. Open the app

Visit [http://localhost:3000](http://localhost:3000).

### Useful Docker commands

```bash
docker compose logs -f          # stream logs
docker compose restart          # restart (re-scans photos on startup)
docker compose down             # stop
docker compose pull && docker compose up -d   # update to latest image
```

---

## Adding Photos

Photos are scanned once on startup. After adding new photos or folders to `PHOTOS_ROOT`:

```bash
# Local:
# Restart the dev server (Ctrl+C, then npm run dev)

# Docker:
docker compose restart
```

---

## Development Commands

```bash
npm run dev      # dev server with hot reload (localhost:3000)
npm run build    # production build
npm run start    # start production server (run build first)
npm run lint     # ESLint
npm run test     # Vitest — 30 unit/integration tests
npm run seed     # create first admin account interactively
```

### Running a single test file

```bash
npx vitest run tests/shortlist.test.ts
```

---

## Project Structure

```
app/                    # Next.js App Router pages + API routes
  api/                  # All API routes
    admin/              # Admin-only endpoints (users, reset-db, settings)
    export/             # CSV, TXT, copy-to-folder exports
    photos/[photoId]/   # thumbnail, full-res, shortlist, skip, etc.
    shortlist/          # GET shortlist
  shortlist/page.tsx    # Shortlist page
  slideshow/page.tsx    # Slideshow page
  gallery/page.tsx      # Gallery grid page
  admin/page.tsx        # Admin portal page

components/             # React client components
  Slideshow.tsx         # Full-screen photo reviewer
  Gallery.tsx           # Photo grid
  ShortlistGrid.tsx     # Shortlist page grid
  ExportButtons.tsx     # CSV / TXT / copy-to-folder buttons
  AdminPanel.tsx        # Admin portal UI

lib/
  db.ts                 # SQLite connection singleton
  scanner.ts            # Filesystem scanner (runs on startup)
  auth.ts               # NextAuth config
  session.ts            # requireUser / requireAdmin helpers

instrumentation.ts      # Next.js hook — runs scanner on startup
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PHOTOS_ROOT` | Yes | Absolute path to photos folder on disk |
| `AUTH_SECRET` | Yes | Random secret for NextAuth session signing (min 32 chars) |
| `DATABASE_PATH` | Yes | Path to SQLite `.db` file |
| `THUMBNAILS_PATH` | Yes | Path to thumbnail cache directory |
| `NEXT_PUBLIC_BASE_URL` | Yes | Public URL of the app (used for links) |

---

## Sharing With Others

See the [README](README.md) for the three networking options (Cloudflare Tunnel, Tailscale, Cloud VPS).

---

## Backup

The only state that matters is in `./data/`:
- `shortlist.db` — all users, shortlist, and progress
- `thumbnails/` — generated thumbnail cache (regenerated automatically if deleted)

Back up `shortlist.db` regularly. Thumbnails can be safely deleted to free space.

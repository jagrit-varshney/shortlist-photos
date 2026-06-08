# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`shortlist-photos` — web app for culling/shortlisting wedding photos. Built for personal use, open-sourced for others.

**Problem:** 11,000 wedding photos on hard disk, need to shortlist ~1,000 for album. Multiple family members (5-6) need to participate, including non-technical parents.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run start    # start production server
npm run lint     # eslint
```

## Architecture

**Stack:** Next.js (App Router, TypeScript) + SQLite (`better-sqlite3`) + Auth.js + Tailwind CSS

**Photo storage:** Local filesystem. `PHOTOS_ROOT` env var points to root folder (e.g. `/path/to/photos`). Subfolders = albums. Scanned once on startup, cached in DB.

**Networking:** Configurable — Cloudflare Tunnel (recommended), Tailscale, or cloud storage. App code is identical across all options.

**Deployment:** Docker Compose for self-hosting.

## Key Data Models

- **folders** — scanned from filesystem, name + path + photo_count
- **photos** — scanned from filesystem, belongs to folder, has thumbnail_path
- **users** — admin-created accounts, email/password auth, role: admin|user
- **progress** — per-user, per-photo `seen` flag. Resume = first unseen photo.
- **shortlist** — shared across users. Status: `shortlisted` | `removed` (soft delete). Tracks `selected_by[]` (JSON array of names) and `removed_by`.

## Core Features

1. **Slideshow** — full-screen, one photo at a time. Big Shortlist / Skip buttons.
   - Progressive load: thumbnail first → full-res swap when ready
   - Preload: next 10 thumbnails + next 2 full-res
2. **Folder-level or root-level selection**
3. **Resume** — per-user progress, resumes at first unseen photo
4. **Shortlist management** — shared, anyone can add/remove, soft delete with recoverable un-shortlisted tab
5. **Counters** — photos left to review, total in shortlist
6. **Export** — CSV + plain text
7. **Admin portal** — create/delete users, reset passwords

## Env Vars

See `.env.example`. Key vars:
- `PHOTOS_ROOT` — absolute path to photos folder on disk
- `AUTH_SECRET` — NextAuth secret
- `DATABASE_PATH` — path to SQLite `.db` file
- `THUMBNAILS_PATH` — path to thumbnail cache dir

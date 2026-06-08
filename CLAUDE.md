# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`shortlist-photos` — web app for culling/shortlisting wedding photos. Built for personal use, open-sourced for others.

**Problem:** 11,000 wedding photos on hard disk, need to shortlist ~1,000 for album. Multiple family members (5-6) need to participate, including non-technical parents.

## Architecture

**Stack:** Next.js + SQLite + Auth.js (email/password)

**Photo storage:** Local filesystem. App is pointed at a root folder (e.g. `/path/to/photos`). Subfolders = albums (e.g. `1st Dec Photos/`, `Candid Photos/`). Scanned once on startup, cached in DB.

**Networking:** Configurable — Cloudflare Tunnel (recommended, public URL), Tailscale (private), or cloud storage upload. App code is identical across all options.

**Deployment:** Docker Compose for self-hosting. Cloudflare Tunnel or Tailscale for remote access.

## Key Data Models

- **Users** — admin-created accounts, email/password auth
- **Photos** — scanned from filesystem, stored in DB with folder/path
- **Progress** — per-user, per-photo `seen` flag. Resume = first unseen photo in folder.
- **Shortlist** — shared across users. Status: `shortlisted` | `removed` (soft delete). Tracks `selected_by[]` and `removed_by`.

## Core Features

1. **Slideshow mode** — full-screen photo display, one at a time. Big Shortlist / Skip buttons.
   - Progressive load: thumbnail first → full-res in background
   - Preload: next 10 thumbnails + next 2 full-res
2. **Folder-level or root-level selection** — user picks folder, clicks "Start Selecting"
3. **Resume** — per-user progress, resumes at first unseen photo
4. **Shortlist management** — add/remove (anyone), un-shortlisted photos recoverable in separate tab
5. **Counters** — photos left to review, photos in shortlist
6. **Export** — CSV (filename, folder, selected_by, date) + plain text list
7. **Admin portal** — create/delete users, reset passwords

## Photo States (per user progress)

- Unseen — not yet displayed to this user
- Seen/Skipped — displayed, not shortlisted
- (Shortlist is global, not per-user)

## Shortlist Behavior

- Shared across all users
- `selected_by[]` — array of usernames who shortlisted the photo
- Same photo shortlisted by multiple users → all names shown
- Removing from shortlist = soft delete (status: `removed`), recoverable
- `removed_by` tracked

## Open Source Notes

- Storage and networking are pluggable via env config
- `docker-compose.yml` = one-command local setup
- README documents 3 deployment options: Cloudflare Tunnel, Tailscale, cloud storage

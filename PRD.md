# Product Requirements Document — shortlist-photos

## Overview

Web app for culling large photo collections collaboratively. Built for a wedding use case (11K photos → ~1K shortlisted) with non-technical family members as primary users.

**Users:** 5–6 family members. One admin (owner). Others are viewers/selectors.
**Photos:** Local filesystem, ~500GB, pre-organised into subfolders.
**Goal:** Each person browses photos at their own pace, shortlists picks into a shared list, exports final list for photographer.

---

## Status Legend

- `[ ]` — Not started
- `[~]` — WIP
- `[x]` — Done

---

## Milestones

- **M1** — Project setup + photo browsing (no auth)
- **M2** — Auth + user management
- **M3** — Shortlisting + progress tracking
- **M4** — Admin portal
- **M5** — Export + polish
- **M6** — Docker + deployment docs

---

## M1 — Project Setup + Photo Browsing ✅

### Tasks

- `[x]` Initialise Next.js project (App Router, TypeScript)
- `[x]` Add SQLite via `better-sqlite3`
- `[x]` Create DB schema (photos, folders, users, progress, shortlist tables)
- `[x]` Filesystem scanner — reads root folder path from env, indexes subfolders + photos into DB on startup
- `[x]` API route: `GET /api/folders` — list all folders with photo count
- `[x]` API route: `GET /api/folders/[folderId]/photos` — paginated photo list
- `[x]` API route: `GET /api/photos/[photoId]/thumbnail` — serve thumbnail (resize on-the-fly via `sharp`)
- `[x]` API route: `GET /api/photos/[photoId]/full` — serve full-res photo
- `[x]` Folder list page — shows all folders, photo count per folder
- `[x]` Slideshow component — full-screen, one photo at a time
  - `[x]` Progressive load: thumbnail first → swap to full-res when ready
  - `[x]` Preload next 10 thumbnails + next 2 full-res
  - `[x]` Big "Shortlist" + "Skip" buttons
  - `[x]` Counter: X of Y reviewed in this folder
- `[x]` Slideshow entry points: start from folder OR start from root (all photos)

### Test Cases

- `[x]` Scanner indexes correct photo count per folder
- `[x]` Scanner skips non-image files (.DS_Store, .json, etc.)
- `[ ]` Thumbnail API returns compressed image, not full-res *(manual — requires real image file)*
- `[ ]` Full-res API returns original file *(manual — requires real image file)*
- `[x]` Slideshow shows photos in consistent order across sessions
- `[ ]` Preload does not block current photo render *(manual — browser test)*
- `[ ]` Counter shows correct X of Y values *(manual — browser test)*

---

## M2 — Auth + User Management ✅

### Tasks

- `[x]` Add Auth.js (NextAuth v4) with credentials provider
- `[x]` DB table: `users` (id, email, name, password_hash, role: admin|user, created_at)
- `[x]` Seed script: create first admin account (`npm run seed`)
- `[x]` Login page (email + password)
- `[x]` Protected routes — redirect to login if unauthenticated (proxy.ts)
- `[x]` Session middleware — attach user to all API requests
- `[x]` Logout

### Test Cases

- `[ ]` Unauthenticated user redirected to login *(manual — requires running server)*
- `[x]` Wrong password returns error, not crash
- `[ ]` Session persists across page refresh *(manual — browser test)*
- `[ ]` Logout clears session, redirects to login *(manual — browser test)*
- `[x]` Admin role vs user role correctly distinguished

---

## M3 — Shortlisting + Progress Tracking ✅

### Tasks

- `[x]` DB table: `progress` (user_id, photo_id, seen: bool, seen_at)
- `[x]` DB table: `shortlist` (photo_id, status: shortlisted|removed, selected_by: json array, removed_by, updated_at)
- `[x]` API route: `POST /api/photos/[photoId]/skip` — mark photo as seen for current user
- `[x]` API route: `POST /api/photos/[photoId]/shortlist` — add to shortlist, append current user to selected_by[]
- `[x]` API route: `POST /api/photos/[photoId]/unshortlist` — soft delete (status → removed, set removed_by)
- `[x]` API route: `POST /api/photos/[photoId]/restore` — restore un-shortlisted photo (status → shortlisted)
- `[x]` Resume logic — `GET /api/folders/[folderId]/resume` returns first unseen photo for current user
- `[x]` "Resume" button on folder list — resumes per-user progress
- `[x]` Shortlist page — grid view of all shortlisted photos
  - `[x]` Shows `selected_by` names on each photo
  - `[x]` Remove button (soft delete)
- `[x]` Un-shortlisted tab — recoverable removed photos, restore button
- `[x]` Counters visible during slideshow:
  - `[x]` Photos left to review (current folder)
  - `[x]` Total in shortlist

### Test Cases

- `[x]` Skipping photo marks it seen for current user only (not other users)
- `[x]` Shortlisting photo adds current user to selected_by[], not duplicated on double-click
- `[x]` Two users shortlist same photo → both names appear
- `[x]` Un-shortlisting moves photo to removed tab, not deleted from DB
- `[x]` Restoring photo moves it back to shortlist with original selected_by intact
- `[x]` Resume returns correct first unseen photo after partial session
- `[x]` Resume on fully-reviewed folder shows "all done" state
- `[ ]` Counters update in real-time during slideshow *(manual — browser test)*

---

## M4 — Admin Portal ✅

### Tasks

- `[x]` Admin-only route guard (proxy.ts + API-level requireAdmin)
- `[x]` User list page — shows all users, role, created date
- `[x]` Create user form — name, email, password, role
- `[x]` Delete user
- `[x]` Reset password form — admin sets new password for any user (no email flow)
- `[x]` Change own password (available to all users via /profile)

### Test Cases

- `[x]` Non-admin cannot access admin routes (returns 403)
- `[x]` Admin can create user, new user can log in immediately
- `[x]` Admin resets password → old password no longer works
- `[x]` Deleting user does not delete their progress or shortlist contributions
- `[x]` Cannot delete own admin account

---

## M5 — Export + Polish ✅

### Tasks

- `[x]` Export API: `GET /api/export/csv` — filename, folder, selected_by (semicolon-separated), shortlisted_at
- `[x]` Export API: `GET /api/export/txt` — one filename per line
- `[x]` Export button on shortlist page (downloads both files)
- `[x]` Folder list shows per-folder progress (X% reviewed) per current user (done in M3)
- `[x]` Empty states — no photos, folder fully reviewed, shortlist empty
- `[x]` Loading states — skeleton while thumbnail loads (pulsing skeleton in slideshow + shortlist grid)
- `[x]` Error states — photo file missing (unavailable placeholder in slideshow)

### Test Cases

- `[x]` CSV export contains correct headers and all shortlisted photos
- `[x]` CSV excludes photos with status `removed`
- `[x]` TXT export = one filename per line, no headers
- `[x]` Export with 0 shortlisted photos returns empty file, not error
- `[x]` Progress % correct after partial review

---

## M6 — Docker + Deployment ✅

### Tasks

- `[x]` `Dockerfile` for Next.js app (standalone output, multi-stage build)
- `[x]` `docker-compose.yml` — app + volume mount for photos folder + SQLite DB
- `[x]` `.env.example` with all required env vars:
  - `PHOTOS_ROOT` — absolute path to photos folder
  - `AUTH_SECRET` — NextAuth secret
  - `DATABASE_PATH` — path to SQLite file
- `[x]` README — setup instructions for 3 deployment options:
  - `[x]` Local (MacBook) + Cloudflare Tunnel
  - `[x]` Local (MacBook) + Tailscale
  - `[x]` Cloud VPS (DigitalOcean / Hetzner / AWS)
- `[x]` Update CLAUDE.md with dev commands

### Test Cases

- `[ ]` `docker compose up` starts app with no manual steps *(manual — requires Docker)*
- `[ ]` App reads photos from mounted volume correctly *(manual — requires Docker)*
- `[ ]` SQLite DB persists across container restarts (volume mount) *(manual — requires Docker)*
- `[ ]` Missing `PHOTOS_ROOT` env var shows clear error on startup, not silent crash *(manual — requires Docker)*

---

## DB Schema (reference)

```sql
folders (id, name, path, photo_count, created_at)

photos (id, folder_id, filename, path, thumbnail_path, created_at)

users (id, email, name, password_hash, role, created_at)

progress (id, user_id, photo_id, seen, seen_at)

shortlist (id, photo_id, status, selected_by, removed_by, created_at, updated_at)
-- selected_by: JSON array of user names
-- status: 'shortlisted' | 'removed'
```

---

## Out of Scope (v1)

- Mobile app (Android/iOS)
- Real-time collaboration (live updates when another user shortlists)
- Comments or ratings on photos
- Keyboard shortcuts
- Google Drive integration
- Email-based invite / password reset flow

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

- `[ ]` Scanner indexes correct photo count per folder
- `[ ]` Scanner skips non-image files (.DS_Store, .json, etc.)
- `[ ]` Thumbnail API returns compressed image, not full-res
- `[ ]` Full-res API returns original file
- `[ ]` Slideshow shows photos in consistent order across sessions
- `[ ]` Preload does not block current photo render
- `[ ]` Counter shows correct X of Y values

---

## M2 — Auth + User Management

### Tasks

- `[ ]` Add Auth.js (NextAuth v5) with credentials provider
- `[ ]` DB table: `users` (id, email, name, password_hash, role: admin|user, created_at)
- `[ ]` Seed script: create first admin account
- `[ ]` Login page (email + password)
- `[ ]` Protected routes — redirect to login if unauthenticated
- `[ ]` Session middleware — attach user to all API requests
- `[ ]` Logout

### Test Cases

- `[ ]` Unauthenticated user redirected to login
- `[ ]` Wrong password returns error, not crash
- `[ ]` Session persists across page refresh
- `[ ]` Logout clears session, redirects to login
- `[ ]` Admin role vs user role correctly distinguished

---

## M3 — Shortlisting + Progress Tracking

### Tasks

- `[ ]` DB table: `progress` (user_id, photo_id, seen: bool, seen_at)
- `[ ]` DB table: `shortlist` (photo_id, status: shortlisted|removed, selected_by: json array, removed_by, updated_at)
- `[ ]` API route: `POST /api/photos/[photoId]/skip` — mark photo as seen for current user
- `[ ]` API route: `POST /api/photos/[photoId]/shortlist` — add to shortlist, append current user to selected_by[]
- `[ ]` API route: `POST /api/photos/[photoId]/unshortlist` — soft delete (status → removed, set removed_by)
- `[ ]` API route: `POST /api/photos/[photoId]/restore` — restore un-shortlisted photo (status → shortlisted)
- `[ ]` Resume logic — `GET /api/folders/[folderId]/resume` returns first unseen photo for current user
- `[ ]` "Resume" button on folder list — resumes per-user progress
- `[ ]` Shortlist page — grid view of all shortlisted photos
  - `[ ]` Shows `selected_by` names on each photo
  - `[ ]` Remove button (soft delete)
- `[ ]` Un-shortlisted tab — recoverable removed photos, restore button
- `[ ]` Counters visible during slideshow:
  - `[ ]` Photos left to review (current folder)
  - `[ ]` Total in shortlist

### Test Cases

- `[ ]` Skipping photo marks it seen for current user only (not other users)
- `[ ]` Shortlisting photo adds current user to selected_by[], not duplicated on double-click
- `[ ]` Two users shortlist same photo → both names appear
- `[ ]` Un-shortlisting moves photo to removed tab, not deleted from DB
- `[ ]` Restoring photo moves it back to shortlist with original selected_by intact
- `[ ]` Resume returns correct first unseen photo after partial session
- `[ ]` Resume on fully-reviewed folder shows "all done" state
- `[ ]` Counters update in real-time during slideshow (no page refresh needed)

---

## M4 — Admin Portal

### Tasks

- `[ ]` Admin-only route guard
- `[ ]` User list page — shows all users, role, created date
- `[ ]` Create user form — name, email, password, role
- `[ ]` Delete user
- `[ ]` Reset password form — admin sets new password for any user (no email flow)
- `[ ]` Change own password (available to all users, not just admin)

### Test Cases

- `[ ]` Non-admin cannot access admin routes (returns 403)
- `[ ]` Admin can create user, new user can log in immediately
- `[ ]` Admin resets password → old password no longer works
- `[ ]` Deleting user does not delete their progress or shortlist contributions
- `[ ]` Cannot delete own admin account

---

## M5 — Export + Polish

### Tasks

- `[ ]` Export API: `GET /api/export/csv` — filename, folder, selected_by (comma-separated), shortlisted_at
- `[ ]` Export API: `GET /api/export/txt` — one filename per line
- `[ ]` Export button on shortlist page (downloads both files)
- `[ ]` Folder list shows per-folder progress (X% reviewed) per current user
- `[ ]` Empty states — no photos, folder fully reviewed, shortlist empty
- `[ ]` Loading states — skeleton while thumbnail loads
- `[ ]` Error states — photo file missing, DB error

### Test Cases

- `[ ]` CSV export contains correct headers and all shortlisted photos
- `[ ]` CSV excludes photos with status `removed`
- `[ ]` TXT export = one filename per line, no headers
- `[ ]` Export with 0 shortlisted photos returns empty file, not error
- `[ ]` Progress % correct after partial review

---

## M6 — Docker + Deployment

### Tasks

- `[ ]` `Dockerfile` for Next.js app
- `[ ]` `docker-compose.yml` — app + volume mount for photos folder + SQLite DB
- `[x]` `.env.example` with all required env vars:
  - `PHOTOS_ROOT` — absolute path to photos folder
  - `AUTH_SECRET` — NextAuth secret
  - `DATABASE_PATH` — path to SQLite file
- `[ ]` README — setup instructions for 3 deployment options:
  - `[ ]` Local (MacBook) + Cloudflare Tunnel
  - `[ ]` Local (MacBook) + Tailscale
  - `[ ]` Cloud storage (generic S3-compatible)
- `[ ]` Update CLAUDE.md with dev commands

### Test Cases

- `[ ]` `docker compose up` starts app with no manual steps
- `[ ]` App reads photos from mounted volume correctly
- `[ ]` SQLite DB persists across container restarts (volume mount)
- `[ ]` Missing `PHOTOS_ROOT` env var shows clear error on startup, not silent crash

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

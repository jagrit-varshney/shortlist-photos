import { describe, it, expect, beforeEach } from "vitest";
import { mockSession, mockRequest } from "./helpers/session";
import { getTestDb, resetTestDb, seedFolder, seedUser } from "./helpers/db";

// helper to get a photo id from the test DB
function getPhoto(folderId: number, index = 0) {
  const db = getTestDb();
  return (db.prepare("SELECT id FROM photos WHERE folder_id = ? ORDER BY sort_order ASC LIMIT 1 OFFSET ?")
    .get(folderId, index) as { id: number }).id;
}

describe("M3 — Shortlisting & Progress", () => {
  let folderId: number;
  let userId1: number;
  let userId2: number;

  beforeEach(() => {
    resetTestDb();
    const db = getTestDb();
    folderId = seedFolder(db, "Wedding", 5);
    userId1 = seedUser(db, "Alice");
    userId2 = seedUser(db, "Bob");
  });

  // ── Skip ────────────────────────────────────────────────────

  it("skipping marks photo seen for that user only, not others", async () => {
    const { POST } = await import("@/app/api/photos/[photoId]/skip/route");
    const db = getTestDb();
    const photoId = getPhoto(folderId);

    mockSession({ id: String(userId1), name: "Alice", email: "alice@test.com", role: "user" });
    const req = mockRequest();
    await POST(req, { params: Promise.resolve({ photoId: String(photoId) }) });

    const p1 = db.prepare("SELECT seen FROM progress WHERE user_id = ? AND photo_id = ?").get(userId1, photoId) as { seen: number } | undefined;
    const p2 = db.prepare("SELECT seen FROM progress WHERE user_id = ? AND photo_id = ?").get(userId2, photoId) as { seen: number } | undefined;

    expect(p1?.seen).toBe(1);
    expect(p2).toBeUndefined();
  });

  // ── Shortlist ────────────────────────────────────────────────

  it("shortlisting adds user name to selected_by[]", async () => {
    const { POST } = await import("@/app/api/photos/[photoId]/shortlist/route");
    const db = getTestDb();
    const photoId = getPhoto(folderId);

    mockSession({ id: String(userId1), name: "Alice", email: "alice@test.com", role: "user" });
    await POST(mockRequest(), { params: Promise.resolve({ photoId: String(photoId) }) });

    const row = db.prepare("SELECT selected_by, status FROM shortlist WHERE photo_id = ?").get(photoId) as { selected_by: string; status: string };
    expect(row.status).toBe("shortlisted");
    expect(JSON.parse(row.selected_by)).toContain("Alice");
  });

  it("shortlisting same photo twice does not duplicate the user name", async () => {
    const { POST } = await import("@/app/api/photos/[photoId]/shortlist/route");
    const db = getTestDb();
    const photoId = getPhoto(folderId);

    mockSession({ id: String(userId1), name: "Alice", email: "alice@test.com", role: "user" });
    await POST(mockRequest(), { params: Promise.resolve({ photoId: String(photoId) }) });
    await POST(mockRequest(), { params: Promise.resolve({ photoId: String(photoId) }) });

    const row = db.prepare("SELECT selected_by FROM shortlist WHERE photo_id = ?").get(photoId) as { selected_by: string };
    const names = JSON.parse(row.selected_by) as string[];
    expect(names.filter((n) => n === "Alice").length).toBe(1);
  });

  it("two users shortlisting same photo shows both names", async () => {
    const { POST } = await import("@/app/api/photos/[photoId]/shortlist/route");
    const db = getTestDb();
    const photoId = getPhoto(folderId);

    mockSession({ id: String(userId1), name: "Alice", email: "alice@test.com", role: "user" });
    await POST(mockRequest(), { params: Promise.resolve({ photoId: String(photoId) }) });

    mockSession({ id: String(userId2), name: "Bob", email: "bob@test.com", role: "user" });
    await POST(mockRequest(), { params: Promise.resolve({ photoId: String(photoId) }) });

    const row = db.prepare("SELECT selected_by FROM shortlist WHERE photo_id = ?").get(photoId) as { selected_by: string };
    const names = JSON.parse(row.selected_by) as string[];
    expect(names).toContain("Alice");
    expect(names).toContain("Bob");
  });

  // ── Unshortlist / Restore ────────────────────────────────────

  it("un-shortlisting moves to removed, not deleted from DB", async () => {
    const { POST: shortlist } = await import("@/app/api/photos/[photoId]/shortlist/route");
    const { POST: unshortlist } = await import("@/app/api/photos/[photoId]/unshortlist/route");
    const db = getTestDb();
    const photoId = getPhoto(folderId);

    mockSession({ id: String(userId1), name: "Alice", email: "alice@test.com", role: "user" });
    await shortlist(mockRequest(), { params: Promise.resolve({ photoId: String(photoId) }) });
    await unshortlist(mockRequest(), { params: Promise.resolve({ photoId: String(photoId) }) });

    const row = db.prepare("SELECT status FROM shortlist WHERE photo_id = ?").get(photoId) as { status: string } | undefined;
    expect(row).toBeDefined();         // still in DB
    expect(row?.status).toBe("removed"); // but marked removed
  });

  it("restoring brings photo back to shortlisted with original selected_by intact", async () => {
    const { POST: shortlist } = await import("@/app/api/photos/[photoId]/shortlist/route");
    const { POST: unshortlist } = await import("@/app/api/photos/[photoId]/unshortlist/route");
    const { POST: restore } = await import("@/app/api/photos/[photoId]/restore/route");
    const db = getTestDb();
    const photoId = getPhoto(folderId);

    mockSession({ id: String(userId1), name: "Alice", email: "alice@test.com", role: "user" });
    await shortlist(mockRequest(), { params: Promise.resolve({ photoId: String(photoId) }) });

    mockSession({ id: String(userId2), name: "Bob", email: "bob@test.com", role: "user" });
    await unshortlist(mockRequest(), { params: Promise.resolve({ photoId: String(photoId) }) });
    await restore(mockRequest(), { params: Promise.resolve({ photoId: String(photoId) }) });

    const row = db.prepare("SELECT status, selected_by, removed_by FROM shortlist WHERE photo_id = ?")
      .get(photoId) as { status: string; selected_by: string; removed_by: string | null };

    expect(row.status).toBe("shortlisted");
    expect(JSON.parse(row.selected_by)).toContain("Alice"); // original selector preserved
    expect(row.removed_by).toBeNull();
  });

  // ── Resume ───────────────────────────────────────────────────

  it("resume returns correct first unseen photo after partial session", async () => {
    const { GET } = await import("@/app/api/folders/[folderId]/resume/route");
    const { POST: skip } = await import("@/app/api/photos/[photoId]/skip/route");
    const db = getTestDb();

    mockSession({ id: String(userId1), name: "Alice", email: "alice@test.com", role: "user" });

    // skip first 2 photos
    const photo0 = getPhoto(folderId, 0);
    const photo1 = getPhoto(folderId, 1);
    await skip(mockRequest(), { params: Promise.resolve({ photoId: String(photo0) }) });
    await skip(mockRequest(), { params: Promise.resolve({ photoId: String(photo1) }) });

    const res = await GET(mockRequest(), { params: Promise.resolve({ folderId: String(folderId) }) });
    const data = await res.json();

    expect(data.done).toBe(false);
    expect(data.photoIndex).toBe(2); // 0-based: index 2 is the third photo
  });

  it("resume returns done:true when all photos reviewed", async () => {
    const { GET } = await import("@/app/api/folders/[folderId]/resume/route");
    const { POST: skip } = await import("@/app/api/photos/[photoId]/skip/route");
    const db = getTestDb();

    mockSession({ id: String(userId1), name: "Alice", email: "alice@test.com", role: "user" });

    // skip all 5 photos
    for (let i = 0; i < 5; i++) {
      const photoId = getPhoto(folderId, i);
      await skip(mockRequest(), { params: Promise.resolve({ photoId: String(photoId) }) });
    }

    const res = await GET(mockRequest(), { params: Promise.resolve({ folderId: String(folderId) }) });
    const data = await res.json();
    expect(data.done).toBe(true);
  });

  // ── Progress counting ────────────────────────────────────────

  it("progress API returns correct seen/total/remaining counts", async () => {
    const { GET } = await import("@/app/api/folders/[folderId]/progress/route");
    const { POST: skip } = await import("@/app/api/photos/[photoId]/skip/route");

    mockSession({ id: String(userId1), name: "Alice", email: "alice@test.com", role: "user" });

    await skip(mockRequest(), { params: Promise.resolve({ photoId: String(getPhoto(folderId, 0)) }) });
    await skip(mockRequest(), { params: Promise.resolve({ photoId: String(getPhoto(folderId, 1)) }) });

    const res = await GET(mockRequest(), { params: Promise.resolve({ folderId: String(folderId) }) });
    const data = await res.json();

    expect(data.total).toBe(5);
    expect(data.seen).toBe(2);
    expect(data.remaining).toBe(3);
  });
});

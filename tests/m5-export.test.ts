import { describe, it, expect, beforeEach } from "vitest";
import { mockSession, mockRequest } from "./helpers/session";
import { getTestDb, resetTestDb, seedFolder, seedUser } from "./helpers/db";

describe("M5 — Export", () => {
  let folderId: number;
  let userId: number;

  beforeEach(() => {
    resetTestDb();
    const db = getTestDb();
    folderId = seedFolder(db, "Wedding", 3);
    userId = seedUser(db, "Alice");
  });

  async function shortlistPhoto(photoId: number, userName: string, userIdStr: string) {
    const { POST } = await import("@/app/api/photos/[photoId]/shortlist/route");
    mockSession({ id: userIdStr, name: userName, email: `${userName.toLowerCase()}@test.com`, role: "user" });
    await POST(mockRequest(), { params: Promise.resolve({ photoId: String(photoId) }) });
  }

  function getPhotoId(index: number): number {
    const db = getTestDb();
    return (db.prepare("SELECT id FROM photos WHERE folder_id = ? ORDER BY sort_order ASC LIMIT 1 OFFSET ?")
      .get(folderId, index) as { id: number }).id;
  }

  it("CSV export has correct headers", async () => {
    const { GET } = await import("@/app/api/export/csv/route");
    mockSession({ id: String(userId), name: "Alice", email: "alice@test.com", role: "user" });

    const res = await GET();
    const text = await res.text();
    const firstLine = text.split("\n")[0];
    expect(firstLine).toBe("filename,folder,selected_by,shortlisted_at");
  });

  it("CSV export includes all shortlisted photos", async () => {
    await shortlistPhoto(getPhotoId(0), "Alice", String(userId));
    await shortlistPhoto(getPhotoId(1), "Alice", String(userId));

    const { GET } = await import("@/app/api/export/csv/route");
    mockSession({ id: String(userId), name: "Alice", email: "alice@test.com", role: "user" });

    const res = await GET();
    const text = await res.text();
    const lines = text.trim().split("\n");
    expect(lines.length).toBe(3); // header + 2 photos
  });

  it("CSV excludes photos with status 'removed'", async () => {
    await shortlistPhoto(getPhotoId(0), "Alice", String(userId));
    await shortlistPhoto(getPhotoId(1), "Alice", String(userId));

    // un-shortlist photo 1
    const { POST: unshortlist } = await import("@/app/api/photos/[photoId]/unshortlist/route");
    mockSession({ id: String(userId), name: "Alice", email: "alice@test.com", role: "user" });
    await unshortlist(mockRequest(), { params: Promise.resolve({ photoId: String(getPhotoId(1)) }) });

    const { GET } = await import("@/app/api/export/csv/route");
    const res = await GET();
    const text = await res.text();
    const lines = text.trim().split("\n");
    expect(lines.length).toBe(2); // header + 1 photo
  });

  it("TXT export is one filename per line with no headers", async () => {
    await shortlistPhoto(getPhotoId(0), "Alice", String(userId));
    await shortlistPhoto(getPhotoId(2), "Alice", String(userId));

    const { GET } = await import("@/app/api/export/txt/route");
    mockSession({ id: String(userId), name: "Alice", email: "alice@test.com", role: "user" });

    const res = await GET();
    const text = await res.text();
    const lines = text.trim().split("\n");

    expect(lines.length).toBe(2);
    expect(lines.every((l) => l.endsWith(".jpg"))).toBe(true); // no headers, just filenames
  });

  it("export with 0 shortlisted photos returns empty body, not error", async () => {
    const { GET: csvGet } = await import("@/app/api/export/csv/route");
    const { GET: txtGet } = await import("@/app/api/export/txt/route");
    mockSession({ id: String(userId), name: "Alice", email: "alice@test.com", role: "user" });

    const csvRes = await csvGet();
    const txtRes = await txtGet();

    expect(csvRes.status).toBe(200);
    expect(txtRes.status).toBe(200);

    const csvText = await csvRes.text();
    const txtText = await txtRes.text();

    // CSV has header only, TXT is empty
    expect(csvText.trim()).toBe("filename,folder,selected_by,shortlisted_at");
    expect(txtText).toBe("");
  });
});

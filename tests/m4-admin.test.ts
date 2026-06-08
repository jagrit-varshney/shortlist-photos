import { describe, it, expect, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { mockSession, mockRequest } from "./helpers/session";
import { getTestDb, resetTestDb, seedUser } from "./helpers/db";

describe("M4 — Admin", () => {
  let adminId: number;
  let userId: number;

  beforeEach(async () => {
    resetTestDb();
    const db = getTestDb();
    adminId = seedUser(db, "Admin", "admin");
    userId = seedUser(db, "Regular", "user");
  });

  it("non-admin gets 403 on admin routes", async () => {
    const { GET } = await import("@/app/api/admin/users/route");
    mockSession({ id: String(userId), name: "Regular", email: "regular@test.com", role: "user" });

    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("unauthenticated request gets 401 on admin routes", async () => {
    const { GET } = await import("@/app/api/admin/users/route");
    mockSession(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("admin can create a new user", async () => {
    const { POST } = await import("@/app/api/admin/users/route");
    mockSession({ id: String(adminId), name: "Admin", email: "admin@test.com", role: "admin" });

    const res = await POST(mockRequest({ name: "New User", email: "new@test.com", password: "secret123", role: "user" }));
    expect(res.status).toBe(201);

    const db = getTestDb();
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get("new@test.com") as { name: string } | undefined;
    expect(user?.name).toBe("New User");
  });

  it("created user can authenticate with their password", async () => {
    const { POST } = await import("@/app/api/admin/users/route");
    mockSession({ id: String(adminId), name: "Admin", email: "admin@test.com", role: "admin" });

    await POST(mockRequest({ name: "Login Test", email: "logintest@test.com", password: "mypassword", role: "user" }));

    const db = getTestDb();
    const row = db.prepare("SELECT password_hash FROM users WHERE email = ?").get("logintest@test.com") as { password_hash: string };
    expect(await bcrypt.compare("mypassword", row.password_hash)).toBe(true);
  });

  it("admin reset password — old password no longer works", async () => {
    const { POST } = await import("@/app/api/admin/users/[userId]/reset-password/route");
    mockSession({ id: String(adminId), name: "Admin", email: "admin@test.com", role: "admin" });

    // set a known old password first
    const db = getTestDb();
    const oldHash = await bcrypt.hash("oldpass", 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(oldHash, userId);

    await POST(
      mockRequest({ password: "newpass123" }),
      { params: Promise.resolve({ userId: String(userId) }) }
    );

    const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as { password_hash: string };
    expect(await bcrypt.compare("oldpass", row.password_hash)).toBe(false);
    expect(await bcrypt.compare("newpass123", row.password_hash)).toBe(true);
  });

  it("deleting user does not delete their shortlist contributions", async () => {
    const { DELETE } = await import("@/app/api/admin/users/[userId]/route");
    const { POST: shortlist } = await import("@/app/api/photos/[photoId]/shortlist/route");
    const db = getTestDb();

    // seed a photo to shortlist
    const folderRes = db.prepare("INSERT INTO folders (name, path, photo_count) VALUES (?, ?, ?)").run("Test", "/test/t", 1);
    const folderId = Number(folderRes.lastInsertRowid);
    const photoRes = db.prepare("INSERT INTO photos (folder_id, filename, path, sort_order) VALUES (?, ?, ?, ?)").run(folderId, "p.jpg", "/test/t/p.jpg", 0);
    const photoId = Number(photoRes.lastInsertRowid);

    mockSession({ id: String(userId), name: "Regular", email: "regular@test.com", role: "user" });
    await shortlist(mockRequest(), { params: Promise.resolve({ photoId: String(photoId) }) });

    // now admin deletes the user
    mockSession({ id: String(adminId), name: "Admin", email: "admin@test.com", role: "admin" });
    await DELETE(mockRequest(), { params: Promise.resolve({ userId: String(userId) }) });

    const row = db.prepare("SELECT selected_by FROM shortlist WHERE photo_id = ?").get(photoId) as { selected_by: string } | undefined;
    expect(row).toBeDefined();
    expect(JSON.parse(row!.selected_by)).toContain("Regular");
  });

  it("cannot delete own admin account", async () => {
    const { DELETE } = await import("@/app/api/admin/users/[userId]/route");
    mockSession({ id: String(adminId), name: "Admin", email: "admin@test.com", role: "admin" });

    const res = await DELETE(mockRequest(), { params: Promise.resolve({ userId: String(adminId) }) });
    expect(res.status).toBe(400);

    const db = getTestDb();
    const still = db.prepare("SELECT id FROM users WHERE id = ?").get(adminId);
    expect(still).toBeDefined();
  });
});

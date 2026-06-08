import { describe, it, expect, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { getTestDb, resetTestDb } from "./helpers/db";

describe("M2 — Auth", () => {
  beforeEach(() => resetTestDb());

  it("correct password verifies successfully", async () => {
    const db = getTestDb();
    const hash = await bcrypt.hash("mypassword123", 12);
    db.prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)").run(
      "user@test.com", "Test User", hash, "user"
    );

    const row = db.prepare("SELECT password_hash FROM users WHERE email = ?").get("user@test.com") as { password_hash: string };
    expect(await bcrypt.compare("mypassword123", row.password_hash)).toBe(true);
  });

  it("wrong password fails verification", async () => {
    const hash = await bcrypt.hash("correctpassword", 12);
    expect(await bcrypt.compare("wrongpassword", hash)).toBe(false);
  });

  it("unknown email returns no user", () => {
    const db = getTestDb();
    const row = db.prepare("SELECT * FROM users WHERE email = ?").get("nobody@test.com");
    expect(row).toBeUndefined();
  });

  it("admin role is stored and retrievable", async () => {
    const db = getTestDb();
    const hash = await bcrypt.hash("pass", 10);
    db.prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)").run(
      "admin@test.com", "Admin", hash, "admin"
    );

    const user = db.prepare("SELECT role FROM users WHERE email = ?").get("admin@test.com") as { role: string };
    expect(user.role).toBe("admin");
  });

  it("user role defaults to 'user'", async () => {
    const db = getTestDb();
    const hash = await bcrypt.hash("pass", 10);
    db.prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)").run(
      "plain@test.com", "Plain", hash
    );

    const user = db.prepare("SELECT role FROM users WHERE email = ?").get("plain@test.com") as { role: string };
    expect(user.role).toBe("user");
  });
});

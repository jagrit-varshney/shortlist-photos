import Database from "better-sqlite3";
import { setDb } from "@/lib/db";

let _testDb: Database.Database | null = null;

export function getTestDb(): Database.Database {
  if (_testDb) return _testDb;
  _testDb = new Database(":memory:");
  _testDb.pragma("journal_mode = WAL");
  _testDb.pragma("foreign_keys = ON");
  initSchema(_testDb);
  setDb(_testDb);
  return _testDb;
}

export function resetTestDb(): void {
  const db = getTestDb();
  // order matters due to FK constraints
  db.exec(`
    DELETE FROM shortlist;
    DELETE FROM progress;
    DELETE FROM photos;
    DELETE FROM folders;
    DELETE FROM users;
  `);
}

export function seedFolder(
  db: Database.Database,
  name: string,
  photoCount: number
): number {
  const res = db
    .prepare("INSERT INTO folders (name, path, photo_count) VALUES (?, ?, ?)")
    .run(name, `/test/${name}`, photoCount);
  const folderId = Number(res.lastInsertRowid);
  for (let i = 0; i < photoCount; i++) {
    db.prepare(
      "INSERT INTO photos (folder_id, filename, path, sort_order) VALUES (?, ?, ?, ?)"
    ).run(folderId, `photo_${i + 1}.jpg`, `/test/${name}/photo_${i + 1}.jpg`, i);
  }
  return folderId;
}

export function seedUser(
  db: Database.Database,
  name: string,
  role: "admin" | "user" = "user"
): number {
  const res = db
    .prepare(
      "INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)"
    )
    .run(`${name.toLowerCase().replace(/ /g, ".")}@test.com`, name, "$2b$12$fakehash", role);
  return Number(res.lastInsertRowid);
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      photo_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER NOT NULL REFERENCES folders(id),
      filename TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      seen INTEGER NOT NULL DEFAULT 0,
      seen_at TEXT,
      UNIQUE(user_id, photo_id)
    );

    CREATE TABLE IF NOT EXISTS shortlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      photo_id INTEGER NOT NULL UNIQUE REFERENCES photos(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'shortlisted' CHECK(status IN ('shortlisted', 'removed')),
      selected_by TEXT NOT NULL DEFAULT '[]',
      removed_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_photos_folder ON photos(folder_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_progress_photo ON progress(photo_id);
    CREATE INDEX IF NOT EXISTS idx_shortlist_status ON shortlist(status);
  `);
}

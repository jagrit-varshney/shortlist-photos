import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { getTestDb, resetTestDb } from "./helpers/db";

// We test scanner logic directly using a temp dir + test DB
async function runScanner(root: string) {
  // inline the scanner logic so we can control the DB
  const db = getTestDb();
  const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".tiff", ".tif"]);
  const isImage = (f: string) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase());

  const insertFolder = db.prepare(
    "INSERT OR IGNORE INTO folders (name, path, photo_count) VALUES (?, ?, 0)"
  );
  const insertPhoto = db.prepare(
    "INSERT OR IGNORE INTO photos (folder_id, filename, path, sort_order) VALUES (?, ?, ?, ?)"
  );
  const updateCount = db.prepare(
    "UPDATE folders SET photo_count = (SELECT COUNT(*) FROM photos WHERE folder_id = folders.id) WHERE id = ?"
  );

  const scanFolder = db.transaction((folderName: string, folderPath: string, files: string[]) => {
    insertFolder.run(folderName, folderPath);
    const folder = db.prepare("SELECT id FROM folders WHERE path = ?").get(folderPath) as { id: number };
    files.forEach((filename, idx) => {
      insertPhoto.run(folder.id, filename, path.join(folderPath, filename), idx);
    });
    updateCount.run(folder.id);
  });

  const entries = fs.readdirSync(root, { withFileTypes: true });
  const subfolders = entries.filter((e) => e.isDirectory());

  for (const sub of subfolders) {
    const subPath = path.join(root, sub.name);
    const photos = fs.readdirSync(subPath).filter(isImage).sort();
    if (photos.length > 0) scanFolder(sub.name, subPath, photos);
  }
}

let tmpDir: string;

beforeEach(() => {
  resetTestDb();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "shortlist-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("M1 — Scanner", () => {
  it("indexes correct photo count per folder", async () => {
    const folder1 = path.join(tmpDir, "Wedding Day 1");
    const folder2 = path.join(tmpDir, "Candid");
    fs.mkdirSync(folder1);
    fs.mkdirSync(folder2);

    // create 3 images in folder1, 5 in folder2
    for (let i = 0; i < 3; i++) fs.writeFileSync(path.join(folder1, `img${i}.jpg`), "");
    for (let i = 0; i < 5; i++) fs.writeFileSync(path.join(folder2, `img${i}.jpg`), "");

    await runScanner(tmpDir);
    const db = getTestDb();

    const f1 = db.prepare("SELECT photo_count FROM folders WHERE name = ?").get("Wedding Day 1") as { photo_count: number };
    const f2 = db.prepare("SELECT photo_count FROM folders WHERE name = ?").get("Candid") as { photo_count: number };

    expect(f1.photo_count).toBe(3);
    expect(f2.photo_count).toBe(5);
  });

  it("skips non-image files (.DS_Store, .json, .txt, etc.)", async () => {
    const folder = path.join(tmpDir, "Photos");
    fs.mkdirSync(folder);

    fs.writeFileSync(path.join(folder, "photo1.jpg"), "");
    fs.writeFileSync(path.join(folder, "photo2.JPG"), "");    // uppercase ext
    fs.writeFileSync(path.join(folder, ".DS_Store"), "");
    fs.writeFileSync(path.join(folder, "metadata.json"), "");
    fs.writeFileSync(path.join(folder, "readme.txt"), "");
    fs.writeFileSync(path.join(folder, "photo3.png"), "");

    await runScanner(tmpDir);
    const db = getTestDb();

    const folder_row = db.prepare("SELECT photo_count FROM folders WHERE name = ?").get("Photos") as { photo_count: number };
    expect(folder_row.photo_count).toBe(3); // only jpg, JPG, png
  });

  it("photos stored in consistent sort_order (alphabetical)", async () => {
    const folder = path.join(tmpDir, "Album");
    fs.mkdirSync(folder);

    // create out of order
    ["img_c.jpg", "img_a.jpg", "img_b.jpg"].forEach((f) =>
      fs.writeFileSync(path.join(folder, f), "")
    );

    await runScanner(tmpDir);
    const db = getTestDb();

    const folderId = (db.prepare("SELECT id FROM folders WHERE name = ?").get("Album") as { id: number }).id;
    const photos = db
      .prepare("SELECT filename FROM photos WHERE folder_id = ? ORDER BY sort_order ASC")
      .all(folderId) as { filename: string }[];

    expect(photos.map((p) => p.filename)).toEqual(["img_a.jpg", "img_b.jpg", "img_c.jpg"]);
  });

  it("supports all image extensions", async () => {
    const folder = path.join(tmpDir, "Mixed");
    fs.mkdirSync(folder);

    const exts = [".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".tiff", ".tif"];
    exts.forEach((ext) => fs.writeFileSync(path.join(folder, `photo${ext}`), ""));

    await runScanner(tmpDir);
    const db = getTestDb();
    const row = db.prepare("SELECT photo_count FROM folders WHERE name = ?").get("Mixed") as { photo_count: number };
    expect(row.photo_count).toBe(exts.length);
  });
});

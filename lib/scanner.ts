import fs from "fs";
import path from "path";
import { getDb } from "./db";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".tiff", ".tif"]);

function isImage(filename: string): boolean {
  return IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

export async function scanPhotos(): Promise<void> {
  const root = process.env.PHOTOS_ROOT;
  if (!root) {
    console.warn("[scanner] PHOTOS_ROOT not set — skipping scan");
    return;
  }
  if (!fs.existsSync(root)) {
    console.error(`[scanner] PHOTOS_ROOT does not exist: ${root}`);
    return;
  }

  const db = getDb();
  const insertFolder = db.prepare(
    "INSERT OR IGNORE INTO folders (name, path, photo_count) VALUES (?, ?, 0)"
  );
  const insertPhoto = db.prepare(
    "INSERT OR IGNORE INTO photos (folder_id, filename, path, sort_order) VALUES (?, ?, ?, ?)"
  );
  const updateCount = db.prepare(
    "UPDATE folders SET photo_count = (SELECT COUNT(*) FROM photos WHERE folder_id = folders.id) WHERE id = ?"
  );

  const entries = fs.readdirSync(root, { withFileTypes: true });
  const subfolders = entries.filter((e) => e.isDirectory());

  // also handle root-level images as a virtual "root" folder
  const rootImages = entries.filter((e) => e.isFile() && isImage(e.name));

  const scanFolder = db.transaction((folderName: string, folderPath: string, files: string[]) => {
    insertFolder.run(folderName, folderPath);
    const folder = db.prepare("SELECT id FROM folders WHERE path = ?").get(folderPath) as { id: number };
    files.forEach((filename, idx) => {
      const fullPath = path.join(folderPath, filename);
      insertPhoto.run(folder.id, filename, fullPath, idx);
    });
    updateCount.run(folder.id);
  });

  for (const sub of subfolders) {
    const subPath = path.join(root, sub.name);
    const photos = fs
      .readdirSync(subPath)
      .filter(isImage)
      .sort();
    if (photos.length > 0) {
      scanFolder(sub.name, subPath, photos);
    }
  }

  if (rootImages.length > 0) {
    const rootFiles = rootImages.map((e) => e.name).sort();
    scanFolder("All Photos", root, rootFiles);
  }

  // Remove DB entries for photos no longer on disk
  const allPhotos = db.prepare("SELECT id, path FROM photos").all() as { id: number; path: string }[];
  const deletePhoto = db.prepare("DELETE FROM photos WHERE id = ?");
  let removed = 0;
  for (const photo of allPhotos) {
    if (!fs.existsSync(photo.path)) {
      deletePhoto.run(photo.id);
      removed++;
    }
  }

  // Remove empty folders
  db.prepare("DELETE FROM folders WHERE photo_count = 0").run();
  // Update counts after deletions
  db.prepare("UPDATE folders SET photo_count = (SELECT COUNT(*) FROM photos WHERE folder_id = folders.id)").run();
  db.prepare("DELETE FROM folders WHERE photo_count = 0").run();

  const total = (db.prepare("SELECT COUNT(*) as c FROM photos").get() as { c: number }).c;
  console.log(`[scanner] Indexed ${total} photos${removed > 0 ? `, removed ${removed} deleted` : ""}`);
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const THUMBNAIL_DIR =
  process.env.THUMBNAILS_PATH ?? path.join(process.cwd(), "data", "thumbnails");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const db = getDb();
  const photo = db
    .prepare("SELECT path, filename FROM photos WHERE id = ?")
    .get(photoId) as { path: string; filename: string } | undefined;

  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!fs.existsSync(photo.path))
    return NextResponse.json({ error: "File missing" }, { status: 404 });

  if (!fs.existsSync(THUMBNAIL_DIR))
    fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });

  const thumbPath = path.join(THUMBNAIL_DIR, `${photoId}.jpg`);

  if (!fs.existsSync(thumbPath)) {
    await sharp(photo.path)
      .rotate() // auto-orient from EXIF
      .resize(600, 600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toFile(thumbPath);
  }

  const buffer = fs.readFileSync(thumbPath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

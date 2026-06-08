import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const db = getDb();
  const photo = db
    .prepare("SELECT path FROM photos WHERE id = ?")
    .get(photoId) as { path: string } | undefined;

  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!fs.existsSync(photo.path))
    return NextResponse.json({ error: "File missing" }, { status: 404 });

  const ext = path.extname(photo.path).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";
  const buffer = fs.readFileSync(photo.path);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

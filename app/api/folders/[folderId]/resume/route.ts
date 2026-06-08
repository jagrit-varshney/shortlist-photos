import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser, isNextResponse } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const user = await requireUser();
  if (isNextResponse(user)) return user;

  const { folderId } = await params;
  const db = getDb();

  if (folderId === "all") {
    // find first unseen photo; count all photos before it to get its index
    const photo = db.prepare(
      `SELECT p.id, p.sort_order, f.name as folder_name
       FROM photos p
       JOIN folders f ON p.folder_id = f.id
       LEFT JOIN progress pr ON pr.photo_id = p.id AND pr.user_id = ?
       WHERE pr.seen IS NULL OR pr.seen = 0
       ORDER BY f.name ASC, p.sort_order ASC
       LIMIT 1`
    ).get(user.id) as { id: number; sort_order: number; folder_name: string } | undefined;

    if (!photo) return NextResponse.json({ done: true, photoIndex: 0 });

    const photoIndex = (db.prepare(
      `SELECT COUNT(*) as c FROM photos p
       JOIN folders f ON p.folder_id = f.id
       WHERE f.name < ? OR (f.name = ? AND p.sort_order < ?)`
    ).get(photo.folder_name, photo.folder_name, photo.sort_order) as { c: number }).c;

    return NextResponse.json({ done: false, photoIndex });
  }

  // folder-level: find first unseen photo, then count its position among all photos in folder
  const photo = db.prepare(
    `SELECT p.id, p.sort_order
     FROM photos p
     LEFT JOIN progress pr ON pr.photo_id = p.id AND pr.user_id = ?
     WHERE p.folder_id = ? AND (pr.seen IS NULL OR pr.seen = 0)
     ORDER BY p.sort_order ASC
     LIMIT 1`
  ).get(user.id, folderId) as { id: number; sort_order: number } | undefined;

  if (!photo) return NextResponse.json({ done: true, photoIndex: 0 });

  const photoIndex = (db.prepare(
    `SELECT COUNT(*) as c FROM photos WHERE folder_id = ? AND sort_order < ?`
  ).get(folderId, photo.sort_order) as { c: number }).c;

  return NextResponse.json({ done: false, photoIndex });
}

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
    // first unseen photo across all folders, ordered by folder name then sort_order
    const photo = db.prepare(
      `SELECT p.id, p.sort_order, f.name as folder_name,
              ROW_NUMBER() OVER (ORDER BY f.name ASC, p.sort_order ASC) - 1 as photo_index
       FROM photos p
       JOIN folders f ON p.folder_id = f.id
       LEFT JOIN progress pr ON pr.photo_id = p.id AND pr.user_id = ?
       WHERE pr.seen IS NULL OR pr.seen = 0
       ORDER BY f.name ASC, p.sort_order ASC
       LIMIT 1`
    ).get(user.id) as { id: number; photo_index: number } | undefined;

    if (!photo) return NextResponse.json({ done: true, photoIndex: 0 });
    return NextResponse.json({ done: false, photoIndex: photo.photo_index });
  }

  const photo = db.prepare(
    `SELECT p.id, p.sort_order,
            ROW_NUMBER() OVER (ORDER BY p.sort_order ASC) - 1 as photo_index
     FROM photos p
     LEFT JOIN progress pr ON pr.photo_id = p.id AND pr.user_id = ?
     WHERE p.folder_id = ? AND (pr.seen IS NULL OR pr.seen = 0)
     ORDER BY p.sort_order ASC
     LIMIT 1`
  ).get(user.id, folderId) as { id: number; photo_index: number } | undefined;

  if (!photo) return NextResponse.json({ done: true, photoIndex: 0 });
  return NextResponse.json({ done: false, photoIndex: photo.photo_index });
}

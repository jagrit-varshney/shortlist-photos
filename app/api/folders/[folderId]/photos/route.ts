import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const { folderId } = await params;
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
  const offset = (page - 1) * limit;

  const db = getDb();
  const photos = db
    .prepare(
      "SELECT id, filename, sort_order FROM photos WHERE folder_id = ? ORDER BY sort_order ASC LIMIT ? OFFSET ?"
    )
    .all(folderId, limit, offset);

  const total = (
    db
      .prepare("SELECT COUNT(*) as c FROM photos WHERE folder_id = ?")
      .get(folderId) as { c: number }
  ).c;

  return NextResponse.json({ photos, total, page, limit });
}

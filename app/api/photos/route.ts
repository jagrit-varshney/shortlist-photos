import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
  const offset = (page - 1) * limit;

  const db = getDb();
  const photos = db
    .prepare(
      `SELECT p.id, p.filename, p.sort_order, f.name as folder_name
       FROM photos p JOIN folders f ON p.folder_id = f.id
       ORDER BY f.name ASC, p.sort_order ASC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);

  const total = (db.prepare("SELECT COUNT(*) as c FROM photos").get() as { c: number }).c;

  return NextResponse.json({ photos, total, page, limit });
}

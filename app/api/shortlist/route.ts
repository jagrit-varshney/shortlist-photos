import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser, isNextResponse } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (isNextResponse(user)) return user;

  const status = req.nextUrl.searchParams.get("status") ?? "shortlisted";
  const db = getDb();

  const rows = db.prepare(
    `SELECT s.id, s.photo_id, s.status, s.selected_by, s.removed_by, s.updated_at,
            p.filename, p.path, f.name as folder_name
     FROM shortlist s
     JOIN photos p ON p.id = s.photo_id
     JOIN folders f ON f.id = p.folder_id
     WHERE s.status = ?
     ORDER BY s.updated_at DESC`
  ).all(status) as Array<{
    id: number;
    photo_id: number;
    status: string;
    selected_by: string;
    removed_by: string | null;
    updated_at: string;
    filename: string;
    folder_name: string;
  }>;

  const photos = rows.map((r) => ({
    ...r,
    selected_by: JSON.parse(r.selected_by) as string[],
  }));

  return NextResponse.json(photos);
}

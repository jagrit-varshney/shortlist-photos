import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser, isNextResponse } from "@/lib/session";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const user = await requireUser();
  if (isNextResponse(user)) return user;

  const { photoId } = await params;
  const db = getDb();

  // mark seen
  db.prepare(
    `INSERT INTO progress (user_id, photo_id, seen, seen_at)
     VALUES (?, ?, 1, datetime('now'))
     ON CONFLICT(user_id, photo_id) DO UPDATE SET seen=1, seen_at=datetime('now')`
  ).run(user.id, photoId);

  // upsert shortlist — append user name if not already in selected_by
  const existing = db
    .prepare("SELECT id, selected_by, status FROM shortlist WHERE photo_id = ?")
    .get(photoId) as { id: number; selected_by: string; status: string } | undefined;

  if (!existing) {
    db.prepare(
      `INSERT INTO shortlist (photo_id, status, selected_by)
       VALUES (?, 'shortlisted', ?)`
    ).run(photoId, JSON.stringify([user.name]));
  } else {
    const names: string[] = JSON.parse(existing.selected_by);
    if (!names.includes(user.name)) names.push(user.name);
    db.prepare(
      `UPDATE shortlist SET status='shortlisted', selected_by=?, updated_at=datetime('now') WHERE photo_id=?`
    ).run(JSON.stringify(names), photoId);
  }

  const count = (
    db.prepare("SELECT COUNT(*) as c FROM shortlist WHERE status='shortlisted'").get() as { c: number }
  ).c;

  return NextResponse.json({ ok: true, shortlistCount: count });
}

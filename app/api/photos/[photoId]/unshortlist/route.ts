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

  db.prepare(
    `UPDATE shortlist SET status='removed', removed_by=?, updated_at=datetime('now') WHERE photo_id=?`
  ).run(user.name, photoId);

  const count = (
    db.prepare("SELECT COUNT(*) as c FROM shortlist WHERE status='shortlisted'").get() as { c: number }
  ).c;

  return NextResponse.json({ ok: true, shortlistCount: count });
}

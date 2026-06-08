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
    `INSERT INTO progress (user_id, photo_id, seen, seen_at)
     VALUES (?, ?, 1, datetime('now'))
     ON CONFLICT(user_id, photo_id) DO UPDATE SET seen=1, seen_at=datetime('now')`
  ).run(user.id, photoId);

  return NextResponse.json({ ok: true });
}

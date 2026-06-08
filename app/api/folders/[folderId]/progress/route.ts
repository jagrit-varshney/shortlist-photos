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

  let total: number;
  let seen: number;

  if (folderId === "all") {
    total = (db.prepare("SELECT COUNT(*) as c FROM photos").get() as { c: number }).c;
    seen = (
      db.prepare(
        "SELECT COUNT(*) as c FROM progress WHERE user_id = ? AND seen = 1"
      ).get(user.id) as { c: number }
    ).c;
  } else {
    total = (
      db.prepare("SELECT COUNT(*) as c FROM photos WHERE folder_id = ?").get(folderId) as { c: number }
    ).c;
    seen = (
      db.prepare(
        `SELECT COUNT(*) as c FROM progress pr
         JOIN photos p ON p.id = pr.photo_id
         WHERE p.folder_id = ? AND pr.user_id = ? AND pr.seen = 1`
      ).get(folderId, user.id) as { c: number }
    ).c;
  }

  return NextResponse.json({ total, seen, remaining: total - seen });
}

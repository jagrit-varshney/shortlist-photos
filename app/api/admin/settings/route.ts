import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, isNextResponse } from "@/lib/admin-guard";

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (isNextResponse(guard)) return guard;

  const { album_title } = await req.json();
  if (typeof album_title !== "string") {
    return NextResponse.json({ error: "album_title must be a string" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('album_title', ?)").run(album_title.trim());
  return NextResponse.json({ ok: true });
}

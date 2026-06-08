import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, isNextResponse } from "@/lib/admin-guard";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const guard = await requireAdmin();
  if (isNextResponse(guard)) return guard;

  const { userId } = await params;

  if (userId === guard.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(userId);

  if (result.changes === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

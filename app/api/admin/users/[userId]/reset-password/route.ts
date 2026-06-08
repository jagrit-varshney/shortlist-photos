import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, isNextResponse } from "@/lib/admin-guard";
import bcrypt from "bcryptjs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const guard = await requireAdmin();
  if (isNextResponse(guard)) return guard;

  const { userId } = await params;
  const { password } = await req.json();

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);
  const db = getDb();
  const result = db
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(hash, userId);

  if (result.changes === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

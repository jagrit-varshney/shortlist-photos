import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser, isNextResponse } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (isNextResponse(user)) return user;

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both passwords required" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(user.id) as { password_hash: string } | undefined;

  if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, row.password_hash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  const hash = await bcrypt.hash(newPassword, 12);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, isNextResponse } from "@/lib/admin-guard";
import bcrypt from "bcryptjs";

export async function GET() {
  const guard = await requireAdmin();
  if (isNextResponse(guard)) return guard;

  const db = getDb();
  const users = db
    .prepare("SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC")
    .all();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (isNextResponse(guard)) return guard;

  const { name, email, password, role } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email and password required" }, { status: 400 });
  }
  if (!["admin", "user"].includes(role ?? "user")) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);
  const db = getDb();

  try {
    const result = db
      .prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)")
      .run(email, name, hash, role ?? "user");
    return NextResponse.json({ id: result.lastInsertRowid, email, name, role: role ?? "user" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }
}

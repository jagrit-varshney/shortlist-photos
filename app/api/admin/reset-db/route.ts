import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM shortlist").run();
    db.prepare("DELETE FROM progress").run();
  })();

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser, isNextResponse } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (isNextResponse(user)) return user;

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.filename
       FROM shortlist s
       JOIN photos p ON p.id = s.photo_id
       JOIN folders f ON f.id = p.folder_id
       WHERE s.status = 'shortlisted'
       ORDER BY f.name ASC, p.sort_order ASC`
    )
    .all() as Array<{ filename: string }>;

  const txt = rows.map((r) => r.filename).join("\n");

  return new NextResponse(txt || "", {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="shortlist-${today()}.txt"`,
    },
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

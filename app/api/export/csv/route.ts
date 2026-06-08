import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser, isNextResponse } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (isNextResponse(user)) return user;

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.filename, f.name as folder_name, s.selected_by, s.created_at as shortlisted_at
       FROM shortlist s
       JOIN photos p ON p.id = s.photo_id
       JOIN folders f ON f.id = p.folder_id
       WHERE s.status = 'shortlisted'
       ORDER BY f.name ASC, p.sort_order ASC`
    )
    .all() as Array<{
      filename: string;
      folder_name: string;
      selected_by: string;
      shortlisted_at: string;
    }>;

  const header = "filename,folder,selected_by,shortlisted_at\n";
  const lines = rows.map((r) => {
    const names = (JSON.parse(r.selected_by) as string[]).join("; ");
    return `"${r.filename}","${r.folder_name}","${names}","${r.shortlisted_at}"`;
  });
  const csv = header + lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="shortlist-${today()}.csv"`,
    },
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

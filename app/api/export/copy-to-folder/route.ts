import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";
import { requireUser, isNextResponse } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (isNextResponse(user)) return user;

  const { folderName } = await req.json() as { folderName?: string };

  if (!folderName || !folderName.trim()) {
    return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
  }

  // Reject path traversal attempts
  const sanitized = folderName.trim();
  if (sanitized.includes("/") || sanitized.includes("\\") || sanitized.startsWith(".")) {
    return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
  }

  const root = process.env.PHOTOS_ROOT;
  if (!root) {
    return NextResponse.json({ error: "PHOTOS_ROOT not configured" }, { status: 500 });
  }

  const destDir = path.join(root, sanitized);
  if (fs.existsSync(destDir)) {
    return NextResponse.json({ error: `Folder "${sanitized}" already exists` }, { status: 409 });
  }

  const db = getDb();
  const rows = db.prepare(
    `SELECT p.path, p.filename
     FROM shortlist s
     JOIN photos p ON p.id = s.photo_id
     WHERE s.status = 'shortlisted'`
  ).all() as Array<{ path: string; filename: string }>;

  if (rows.length === 0) {
    return NextResponse.json({ error: "No shortlisted photos to copy" }, { status: 400 });
  }

  fs.mkdirSync(destDir, { recursive: true });

  let copied = 0;
  for (const row of rows) {
    const dest = path.join(destDir, row.filename);
    // Handle duplicate filenames across folders by prefixing
    const finalDest = fs.existsSync(dest)
      ? path.join(destDir, `${copied}_${row.filename}`)
      : dest;
    fs.copyFileSync(row.path, finalDest);
    copied++;
  }

  return NextResponse.json({ ok: true, copied, folderName: sanitized });
}

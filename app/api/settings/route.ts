import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'album_title'").get() as { value: string } | undefined;
  return NextResponse.json({ album_title: row?.value ?? "" });
}

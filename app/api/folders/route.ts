import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const folders = db
    .prepare("SELECT id, name, photo_count FROM folders ORDER BY name ASC")
    .all();
  return NextResponse.json(folders);
}

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

export async function requireUser(): Promise<SessionUser | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as SessionUser;
  return user;
}

export function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}

import { vi } from "vitest";
import { getServerSession } from "next-auth";

export function mockSession(user: { id: string; name: string; email: string; role: string } | null) {
  vi.mocked(getServerSession).mockResolvedValue(
    user ? { user, expires: "9999" } : null
  );
}

export function mockRequest(body?: unknown, searchParams?: Record<string, string>) {
  const url = new URL("http://localhost:3000/api/test");
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return {
    json: async () => body,
    nextUrl: url,
  } as unknown as import("next/server").NextRequest;
}

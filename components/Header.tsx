"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Header() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
      <Link href="/" className="text-white font-bold text-lg">
        shortlist-photos
      </Link>
      <div className="flex items-center gap-4">
        {isAdmin && (
          <Link href="/admin" className="text-gray-400 hover:text-white text-sm transition-colors">
            Admin
          </Link>
        )}
        <span className="text-gray-400 text-sm">{session?.user?.name}</span>
        <Link href="/profile" className="text-sm text-gray-400 hover:text-white transition-colors">
          Password
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

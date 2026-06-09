"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Header() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  const [albumTitle, setAlbumTitle] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.album_title) setAlbumTitle(d.album_title); });
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
      <Link href="/" className="flex items-center gap-3">
        <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
        <span className="text-white font-bold text-lg leading-tight">
          {albumTitle || "shortlist-photos"}
        </span>
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  folderId: number;
  folderName: string;
}

export default function ResumeButton({ folderId, folderName }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleResume() {
    setLoading(true);
    try {
      const res = await fetch(`/api/folders/${folderId}/resume`);
      const data = await res.json();
      if (data.done) {
        router.push(`/slideshow?folderId=${folderId}&folderName=${encodeURIComponent(folderName)}`);
      } else {
        router.push(
          `/slideshow?folderId=${folderId}&folderName=${encodeURIComponent(folderName)}&startIndex=${data.photoIndex}`
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleResume}
      disabled={loading}
      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
    >
      {loading ? "…" : "Resume"}
    </button>
  );
}

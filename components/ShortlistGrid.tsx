"use client";

import { useEffect, useState, useCallback } from "react";

interface ShortlistItem {
  id: number;
  photo_id: number;
  status: string;
  selected_by: string[];
  removed_by: string | null;
  updated_at: string;
  filename: string;
  folder_name: string;
}

type Tab = "shortlisted" | "removed";

export default function ShortlistGrid() {
  const [tab, setTab] = useState<Tab>("shortlisted");
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (status: Tab) => {
    setLoading(true);
    const res = await fetch(`/api/shortlist?status=${status}`);
    if (res.ok) {
      setItems(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  async function handleUnshortlist(photoId: number) {
    await fetch(`/api/photos/${photoId}/unshortlist`, { method: "POST" });
    setItems((prev) => prev.filter((i) => i.photo_id !== photoId));
  }

  async function handleRestore(photoId: number) {
    await fetch(`/api/photos/${photoId}/restore`, { method: "POST" });
    setItems((prev) => prev.filter((i) => i.photo_id !== photoId));
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800 rounded-xl p-1 w-fit">
        {(["shortlisted", "removed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {t === "shortlisted" ? "★ Shortlisted" : "Removed"}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg mb-2">
            {tab === "shortlisted" ? "No photos shortlisted yet." : "No removed photos."}
          </p>
          {tab === "shortlisted" && (
            <p className="text-gray-600 text-sm">
              Go to a folder and tap <strong className="text-gray-500">☆ Shortlist</strong> on photos you want to keep.
            </p>
          )}
        </div>
      )}

      {!loading && items.length > 0 && (
        <p className="text-gray-400 text-sm mb-4">{items.length} photos</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <div key={item.id} className="relative group rounded-xl overflow-hidden bg-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${item.photo_id}/thumbnail`}
              alt={item.filename}
              className="w-full aspect-square object-cover"
              loading="lazy"
            />

            {/* overlay on hover */}
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
              <div>
                <p className="text-white text-xs font-medium truncate">{item.filename}</p>
                <p className="text-gray-400 text-xs truncate">{item.folder_name}</p>
              </div>

              <div>
                {item.selected_by.length > 0 && (
                  <p className="text-indigo-300 text-xs mb-2">
                    by {item.selected_by.join(", ")}
                  </p>
                )}
                {tab === "shortlisted" ? (
                  <button
                    onClick={() => handleUnshortlist(item.photo_id)}
                    className="w-full py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors"
                  >
                    Remove
                  </button>
                ) : (
                  <div>
                    <p className="text-gray-400 text-xs mb-1">
                      Removed by {item.removed_by ?? "unknown"}
                    </p>
                    <button
                      onClick={() => handleRestore(item.photo_id)}
                      className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                    >
                      Restore
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

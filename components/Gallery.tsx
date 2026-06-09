"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Photo {
  id: number;
  filename: string;
  sort_order: number;
}

interface GalleryProps {
  folderId: string;
  folderName: string;
}

export default function Gallery({ folderId, folderName }: GalleryProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shortlistedIds, setShortlistedIds] = useState<Set<number>>(new Set());

  const apiBase =
    folderId === "all" ? `/api/photos` : `/api/folders/${folderId}/photos`;

  // load all photo metadata progressively (images themselves are lazy-loaded)
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      let page = 1;
      let all: Photo[] = [];
      while (!cancelled) {
        const res = await fetch(`${apiBase}?page=${page}&limit=200`);
        if (!res.ok) break;
        const data = await res.json();
        all = [...all, ...data.photos];
        if (!cancelled) {
          setPhotos([...all]);
          setTotal(data.total);
        }
        if (all.length >= data.total) break;
        page++;
      }
      if (!cancelled) setLoading(false);
    }
    loadAll();
    return () => { cancelled = true; };
  }, [apiBase]);

  useEffect(() => {
    fetch("/api/shortlist")
      .then((r) => (r.ok ? r.json() : []))
      .then((items: Array<{ photo_id: number }>) => {
        setShortlistedIds(new Set(items.map((i) => i.photo_id)));
      });
  }, []);

  function openAt(index: number) {
    router.push(
      `/slideshow?folderId=${folderId}&folderName=${encodeURIComponent(folderName)}&startIndex=${index}`
    );
  }

  async function handleRemove(photoId: number, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/photos/${photoId}/unshortlist`, { method: "POST" });
    setShortlistedIds((prev) => { const s = new Set(prev); s.delete(photoId); return s; });
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors" title="Home">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-300 text-sm">{folderName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm">
            {loading ? `Loading…` : `${total} photos`}
          </span>
          <Link
            href={`/slideshow?folderId=${folderId}&folderName=${encodeURIComponent(folderName)}`}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            Slideshow →
          </Link>
        </div>
      </div>

      {/* Skeleton while first page loads */}
      {loading && photos.length === 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-0.5 p-0.5">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      {/* Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-0.5 p-0.5">
          {photos.map((photo, idx) => {
            const isShortlisted = shortlistedIds.has(photo.id);
            return (
              <button
                key={photo.id}
                onClick={() => openAt(idx)}
                className="relative aspect-square group overflow-hidden bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset"
                title={`${photo.filename} (#${idx + 1})`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photos/${photo.id}/thumbnail`}
                  alt={photo.filename}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-150"
                />
                {/* Shortlisted badge + remove button */}
                {isShortlisted && (
                  <>
                    <div className="absolute top-1 right-1 bg-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-xs shadow pointer-events-none">
                      ★
                    </div>
                    <button
                      onClick={(e) => handleRemove(photo.id, e)}
                      className="absolute top-1 left-1 bg-red-700 hover:bg-red-600 rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-sm font-bold transition-opacity shadow"
                      title="Remove from shortlist"
                    >
                      ×
                    </button>
                  </>
                )}
                {/* Photo number on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-150 flex items-end">
                  <span className="text-white text-xs px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {idx + 1}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading more indicator */}
      {loading && photos.length > 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">Loading more…</div>
      )}
    </div>
  );
}

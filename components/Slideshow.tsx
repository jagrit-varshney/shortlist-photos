"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

interface Photo {
  id: number;
  filename: string;
  sort_order: number;
}

interface SlideshowProps {
  folderId: string;
  folderName: string;
}

const PRELOAD_THUMBNAILS = 10;
const PRELOAD_FULL = 2;
const PAGE_SIZE = 100;

export default function Slideshow({ folderId, folderName }: SlideshowProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fullResLoaded, setFullResLoaded] = useState(false);
  const [done, setDone] = useState(false);
  const preloadedFull = useRef<Set<number>>(new Set());
  const preloadedThumb = useRef<Set<number>>(new Set());

  const thumbUrl = (id: number) => `/api/photos/${id}/thumbnail`;
  const fullUrl = (id: number) => `/api/photos/${id}/full`;

  const apiBase =
    folderId === "all"
      ? `/api/photos`
      : `/api/folders/${folderId}/photos`;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`${apiBase}?page=1&limit=${PAGE_SIZE}`);
      if (!res.ok) return;
      const data = await res.json();
      setPhotos(data.photos);
      setTotal(data.total);
      setLoading(false);
    }
    load();
  }, [apiBase]);

  // preload thumbnails for next N photos
  useEffect(() => {
    if (photos.length === 0) return;
    for (let i = index + 1; i <= index + PRELOAD_THUMBNAILS && i < photos.length; i++) {
      const id = photos[i].id;
      if (preloadedThumb.current.has(id)) continue;
      preloadedThumb.current.add(id);
      const img = new Image();
      img.src = thumbUrl(id);
    }
  }, [index, photos]);

  // preload full-res for next N photos
  useEffect(() => {
    if (photos.length === 0) return;
    for (let i = index + 1; i <= index + PRELOAD_FULL && i < photos.length; i++) {
      const id = photos[i].id;
      if (preloadedFull.current.has(id)) continue;
      preloadedFull.current.add(id);
      const img = new Image();
      img.src = fullUrl(id);
    }
  }, [index, photos]);

  const advance = useCallback(() => {
    if (index + 1 >= photos.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setFullResLoaded(false);
    }
  }, [index, photos.length]);

  const handleShortlist = useCallback(() => {
    // shortlist logic comes in M3 — for now just advance
    advance();
  }, [advance]);

  const handleSkip = useCallback(() => {
    advance();
  }, [advance]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white text-xl">
        Loading photos…
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <p className="text-xl">No photos found in this folder.</p>
        <Link href="/" className="text-indigo-400 underline">Back to folders</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-6">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold">All done with {folderName}!</h2>
        <p className="text-gray-400">You reviewed all {photos.length} photos.</p>
        <Link href="/" className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl text-lg font-medium transition-colors">
          Back to folders
        </Link>
      </div>
    );
  }

  const current = photos[index];

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
        <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
          ← {folderName}
        </Link>
        <span className="text-gray-400 text-sm">
          {index + 1} / {photos.length}
        </span>
      </div>

      {/* Photo */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {/* Thumbnail (shows first, blurred placeholder) */}
        {!fullResLoaded && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`thumb-${current.id}`}
            src={thumbUrl(current.id)}
            alt={current.filename}
            className="max-h-full max-w-full object-contain"
          />
        )}

        {/* Full-res (loads behind, swaps in) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={`full-${current.id}`}
          src={fullUrl(current.id)}
          alt={current.filename}
          className={`max-h-full max-w-full object-contain absolute inset-0 m-auto transition-opacity duration-300 ${
            fullResLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setFullResLoaded(true)}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-4 p-6 bg-gray-900">
        <button
          onClick={handleSkip}
          className="flex-1 py-5 rounded-2xl bg-gray-700 hover:bg-gray-600 text-white text-xl font-semibold transition-colors active:scale-95"
        >
          Skip
        </button>
        <button
          onClick={handleShortlist}
          className="flex-1 py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xl font-semibold transition-colors active:scale-95"
        >
          ★ Shortlist
        </button>
      </div>
    </div>
  );
}

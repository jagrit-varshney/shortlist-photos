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
  startIndex?: number;
}

const PRELOAD_THUMBNAILS = 10;
const PRELOAD_FULL = 2;
const PAGE_SIZE = 100;

export default function Slideshow({ folderId, folderName, startIndex = 0 }: SlideshowProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [shortlistCount, setShortlistCount] = useState(0);
  const [shortlistedIds, setShortlistedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [fullResLoaded, setFullResLoaded] = useState(false);
  const [done, setDone] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const preloadedFull = useRef<Set<number>>(new Set());
  const preloadedThumb = useRef<Set<number>>(new Set());

  const thumbUrl = (id: number) => `/api/photos/${id}/thumbnail`;
  const fullUrl = (id: number) => `/api/photos/${id}/full`;

  const apiBase =
    folderId === "all" ? `/api/photos` : `/api/folders/${folderId}/photos`;

  // load photos starting from the right page for startIndex
  useEffect(() => {
    async function load() {
      setLoading(true);

      const startPage = Math.floor(startIndex / PAGE_SIZE) + 1;
      const offsetInPage = startIndex % PAGE_SIZE;

      const res = await fetch(`${apiBase}?page=${startPage}&limit=${PAGE_SIZE}`);
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();

      setPhotos(data.photos);
      setTotal(data.total);
      setIndex(offsetInPage);
      setLoading(false);
    }
    load();
  }, [apiBase, startIndex]);

  // fetch initial shortlist count + which photos are shortlisted in this batch
  useEffect(() => {
    async function fetchShortlist() {
      const res = await fetch("/api/shortlist");
      if (!res.ok) return;
      const items: Array<{ photo_id: number }> = await res.json();
      setShortlistCount(items.length);
      setShortlistedIds(new Set(items.map((i) => i.photo_id)));
    }
    fetchShortlist();
  }, []);

  // preload thumbnails
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

  // preload full-res
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

  // load next page when near the end of current page
  useEffect(() => {
    if (photos.length === 0) return;
    if (index < photos.length - 20) return;

    const currentPage = Math.floor(startIndex / PAGE_SIZE) + 1;
    const nextPage = currentPage + Math.floor(photos.length / PAGE_SIZE);
    if (nextPage * PAGE_SIZE >= total) return;

    fetch(`${apiBase}?page=${nextPage + 1}&limit=${PAGE_SIZE}`)
      .then((r) => r.json())
      .then((data) => {
        setPhotos((prev) => [...prev, ...data.photos]);
      });
  }, [index, photos.length, total, apiBase, startIndex]);

  const advance = useCallback(() => {
    if (index + 1 >= photos.length && photos.length >= total) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setFullResLoaded(false);
    }
  }, [index, photos.length, total]);

  const handleSkip = useCallback(async () => {
    if (actionPending) return;
    const photoId = photos[index]?.id;
    if (!photoId) return;
    setActionPending(true);
    advance();
    // fire-and-forget — don't block UX
    fetch(`/api/photos/${photoId}/skip`, { method: "POST" }).finally(() =>
      setActionPending(false)
    );
  }, [actionPending, photos, index, advance]);

  const handleShortlist = useCallback(async () => {
    if (actionPending) return;
    const photoId = photos[index]?.id;
    if (!photoId) return;
    setActionPending(true);

    // optimistic update
    setShortlistedIds((prev) => new Set(prev).add(photoId));
    setShortlistCount((c) => c + (shortlistedIds.has(photoId) ? 0 : 1));
    advance();

    fetch(`/api/photos/${photoId}/shortlist`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => { if (data.shortlistCount !== undefined) setShortlistCount(data.shortlistCount); })
      .finally(() => setActionPending(false));
  }, [actionPending, photos, index, advance, shortlistedIds]);

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
        <p className="text-gray-400">You reviewed all photos in this folder.</p>
        <Link
          href="/"
          className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl text-lg font-medium transition-colors"
        >
          Back to folders
        </Link>
      </div>
    );
  }

  const current = photos[index];
  const isShortlisted = shortlistedIds.has(current?.id);
  const reviewed = index + (startIndex % PAGE_SIZE === 0 ? 0 : startIndex % PAGE_SIZE);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
        <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
          ← {folderName}
        </Link>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{index + 1} / {photos.length}{total > photos.length ? `+` : ""}</span>
          <Link href="/shortlist" className="text-indigo-400 hover:text-indigo-300">
            ★ {shortlistCount}
          </Link>
        </div>
      </div>

      {/* Photo */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden min-h-0">
        {!fullResLoaded && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`thumb-${current.id}`}
            src={thumbUrl(current.id)}
            alt={current.filename}
            className="max-h-full max-w-full object-contain"
          />
        )}
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

      {/* Filename */}
      <div className="text-center py-1 text-gray-600 text-xs truncate px-4">
        {current.filename}
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
          className={`flex-1 py-5 rounded-2xl text-white text-xl font-semibold transition-colors active:scale-95 ${
            isShortlisted
              ? "bg-indigo-800 hover:bg-indigo-700"
              : "bg-indigo-600 hover:bg-indigo-500"
          }`}
        >
          {isShortlisted ? "★ Shortlisted" : "☆ Shortlist"}
        </button>
      </div>
    </div>
  );
}

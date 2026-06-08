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
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [fullResLoaded, setFullResLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
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

  // fetch initial shortlist count + which photos are shortlisted
  useEffect(() => {
    fetch("/api/shortlist")
      .then((r) => r.ok ? r.json() : [])
      .then((items: Array<{ photo_id: number }>) => {
        setShortlistCount(items.length);
        setShortlistedIds(new Set(items.map((i) => i.photo_id)));
      });
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

  // load next page when near end of current batch
  useEffect(() => {
    if (photos.length === 0 || index < photos.length - 20) return;
    const startPage = Math.floor(startIndex / PAGE_SIZE) + 1;
    const nextPage = startPage + Math.floor(photos.length / PAGE_SIZE);
    if (nextPage * PAGE_SIZE >= total) return;
    fetch(`${apiBase}?page=${nextPage + 1}&limit=${PAGE_SIZE}`)
      .then((r) => r.json())
      .then((data) => setPhotos((prev) => [...prev, ...data.photos]));
  }, [index, photos.length, total, apiBase, startIndex]);

  // reset image state when photo changes
  useEffect(() => {
    setThumbLoaded(false);
    setFullResLoaded(false);
    setImgError(false);
  }, [index]);

  const advance = useCallback(() => {
    if (index + 1 >= photos.length && photos.length >= total) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, photos.length, total]);

  const handleSkip = useCallback(() => {
    if (actionPending) return;
    const photoId = photos[index]?.id;
    if (!photoId) return;
    setActionPending(true);
    advance();
    fetch(`/api/photos/${photoId}/skip`, { method: "POST" })
      .finally(() => setActionPending(false));
  }, [actionPending, photos, index, advance]);

  const handleShortlist = useCallback(() => {
    if (actionPending) return;
    const photoId = photos[index]?.id;
    if (!photoId) return;
    setActionPending(true);
    setShortlistedIds((prev) => new Set(prev).add(photoId));
    setShortlistCount((c) => c + (shortlistedIds.has(photoId) ? 0 : 1));
    advance();
    fetch(`/api/photos/${photoId}/shortlist`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => { if (d.shortlistCount !== undefined) setShortlistCount(d.shortlistCount); })
      .finally(() => setActionPending(false));
  }, [actionPending, photos, index, advance, shortlistedIds]);

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
          <Link href="/" className="text-gray-400 text-sm">← {folderName}</Link>
          <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center bg-black">
          <div className="w-full max-w-lg aspect-[4/3] bg-gray-800 rounded animate-pulse mx-4" />
        </div>
        <div className="flex gap-4 p-6 bg-gray-900">
          <div className="flex-1 h-16 rounded-2xl bg-gray-700 animate-pulse" />
          <div className="flex-1 h-16 rounded-2xl bg-indigo-900 animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────
  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4 p-6">
        <p className="text-xl text-center">No photos found in <strong>{folderName}</strong>.</p>
        <p className="text-gray-500 text-sm text-center">
          Make sure <code className="bg-gray-800 px-1 rounded">PHOTOS_ROOT</code> is set and the folder contains images.
        </p>
        <Link href="/" className="text-indigo-400 underline">← Back to folders</Link>
      </div>
    );
  }

  // ── Done state ──────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-6 p-6">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold text-center">All done with {folderName}!</h2>
        <p className="text-gray-400 text-center">You reviewed all photos in this folder.</p>
        <div className="flex gap-3">
          <Link href="/shortlist" className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl text-lg font-medium transition-colors">
            View shortlist
          </Link>
          <Link href="/" className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-xl text-lg font-medium transition-colors">
            All folders
          </Link>
        </div>
      </div>
    );
  }

  const current = photos[index];
  const isShortlisted = shortlistedIds.has(current?.id);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
        <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
          ← {folderName}
        </Link>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{index + 1} / {total}</span>
          <Link href="/shortlist" className="text-indigo-400 hover:text-indigo-300 font-medium">
            ★ {shortlistCount}
          </Link>
        </div>
      </div>

      {/* Photo area */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden min-h-0">

        {/* Skeleton — visible until thumbnail loads */}
        {!thumbLoaded && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full max-w-2xl aspect-[4/3] bg-gray-800 animate-pulse rounded mx-4" />
          </div>
        )}

        {/* Error state — file missing or API error */}
        {imgError && (
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Photo unavailable</p>
            <p className="text-xs text-gray-600">{current.filename}</p>
          </div>
        )}

        {/* Thumbnail */}
        {!imgError && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`thumb-${current.id}`}
            src={thumbUrl(current.id)}
            alt={current.filename}
            className={`max-h-full max-w-full object-contain transition-opacity duration-200 ${
              thumbLoaded && !fullResLoaded ? "opacity-100" : "opacity-0 absolute"
            }`}
            onLoad={() => setThumbLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}

        {/* Full-res — swaps in over thumbnail */}
        {!imgError && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`full-${current.id}`}
            src={fullUrl(current.id)}
            alt={current.filename}
            className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${
              fullResLoaded ? "opacity-100" : "opacity-0 absolute"
            }`}
            onLoad={() => setFullResLoaded(true)}
          />
        )}
      </div>

      {/* Filename */}
      <div className="text-center py-1 text-gray-600 text-xs truncate px-4 bg-black">
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

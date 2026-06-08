"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Slideshow from "@/components/Slideshow";

function SlideshowInner() {
  const params = useSearchParams();
  const router = useRouter();
  const folderId = params.get("folderId") ?? "";
  const folderName = params.get("folderName") ?? "Photos";
  const startIndex = parseInt(params.get("startIndex") ?? "0");

  if (!folderId) {
    router.push("/");
    return null;
  }

  return <Slideshow folderId={folderId} folderName={folderName} startIndex={startIndex} />;
}

export default function SlideshowPage() {
  return (
    <Suspense>
      <SlideshowInner />
    </Suspense>
  );
}

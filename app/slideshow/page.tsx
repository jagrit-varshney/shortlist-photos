"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Slideshow from "@/components/Slideshow";

function SlideshowInner() {
  const params = useSearchParams();
  const router = useRouter();
  const folderId = params.get("folderId") ?? "";
  const folderName = params.get("folderName") ?? "Photos";

  if (!folderId) {
    router.push("/");
    return null;
  }

  return <Slideshow folderId={folderId} folderName={folderName} />;
}

export default function SlideshowPage() {
  return (
    <Suspense>
      <SlideshowInner />
    </Suspense>
  );
}

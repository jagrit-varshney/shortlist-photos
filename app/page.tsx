import Link from "next/link";
import Header from "@/components/Header";

interface Folder {
  id: number;
  name: string;
  photo_count: number;
}

async function getFolders(): Promise<Folder[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/folders`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const folders = await getFolders();
  const totalPhotos = folders.reduce((s, f) => s + f.photo_count, 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Header />
      <main className="flex-1 p-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-gray-400 mb-8 mt-4">Select a folder to start reviewing photos.</p>

        {folders.length === 0 && (
          <div className="text-gray-500 text-center py-16">
            No folders found. Set{" "}
            <code className="bg-gray-800 px-1 rounded">PHOTOS_ROOT</code> in your{" "}
            <code className="bg-gray-800 px-1 rounded">.env.local</code> and restart.
          </div>
        )}

        <div className="space-y-3">
          {folders.map((folder) => (
            <Link
              key={folder.id}
              href={`/slideshow?folderId=${folder.id}&folderName=${encodeURIComponent(folder.name)}`}
              className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 rounded-xl px-5 py-4 transition-colors"
            >
              <span className="font-medium text-lg">{folder.name}</span>
              <span className="text-gray-400 text-sm">{folder.photo_count} photos</span>
            </Link>
          ))}
        </div>

        {folders.length > 1 && (
          <Link
            href={`/slideshow?folderId=all&folderName=All+Photos`}
            className="mt-6 flex items-center justify-between bg-indigo-700 hover:bg-indigo-600 rounded-xl px-5 py-4 transition-colors"
          >
            <span className="font-medium text-lg">All Photos</span>
            <span className="text-indigo-200 text-sm">{totalPhotos} photos</span>
          </Link>
        )}
      </div>
      </main>
    </div>
  );
}

import Link from "next/link";
import Header from "@/components/Header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

interface Folder {
  id: number;
  name: string;
  photo_count: number;
}

interface FolderProgress {
  folderId: number | "all";
  seen: number;
  total: number;
}

function getAlbumTitle(): string {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'album_title'").get() as { value: string } | undefined;
    return row?.value ?? "";
  } catch {
    return "";
  }
}

function getFolders(): Folder[] {
  try {
    const db = getDb();
    return db.prepare("SELECT id, name, photo_count FROM folders ORDER BY name ASC").all() as Folder[];
  } catch {
    return [];
  }
}

function getProgressForUser(userId: string, folders: Folder[]): Map<number | "all", FolderProgress> {
  const db = getDb();
  const map = new Map<number | "all", FolderProgress>();

  for (const folder of folders) {
    const seen = (
      db.prepare(
        `SELECT COUNT(*) as c FROM progress pr
         JOIN photos p ON p.id = pr.photo_id
         WHERE p.folder_id = ? AND pr.user_id = ? AND pr.seen = 1`
      ).get(folder.id, userId) as { c: number }
    ).c;
    map.set(folder.id, { folderId: folder.id, seen, total: folder.photo_count });
  }

  return map;
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id ?? "";

  const folders = getFolders();
  const albumTitle = getAlbumTitle();
  const totalPhotos = folders.reduce((s, f) => s + f.photo_count, 0);
  const progressMap = userId ? getProgressForUser(userId, folders) : new Map();
  const totalSeen = [...progressMap.values()].reduce((s, p) => s + p.seen, 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Header />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">

          {/* Album title */}
          {albumTitle && (
            <h1 className="text-2xl font-bold text-white text-center mb-6 mt-2">{albumTitle}</h1>
          )}

          {/* Shortlist summary */}
          <div className="flex items-center justify-between mb-6 mt-2">
            <p className="text-gray-400">Select a folder to review photos.</p>
            <Link
              href="/shortlist"
              className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
            >
              View shortlist →
            </Link>
          </div>

          {folders.length === 0 && (
            <div className="text-gray-500 text-center py-16">
              No folders found. Set{" "}
              <code className="bg-gray-800 px-1 rounded">PHOTOS_ROOT</code> in your{" "}
              <code className="bg-gray-800 px-1 rounded">.env.local</code> and restart.
            </div>
          )}

          <div className="space-y-3">
            {folders.map((folder) => {
              const prog = progressMap.get(folder.id);
              const pct = prog && prog.total > 0 ? Math.round((prog.seen / prog.total) * 100) : 0;
              const isDone = prog && prog.seen >= prog.total && prog.total > 0;
              const inProgress = prog && prog.seen > 0 && !isDone;

              return (
                <div key={folder.id} className="bg-gray-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <span className="font-medium text-lg">{folder.name}</span>
                      <div className="text-gray-400 text-sm mt-0.5">
                        {folder.photo_count} photos
                        {prog && prog.seen > 0 && (
                          <span className="ml-2">· {prog.seen} reviewed ({pct}%)</span>
                        )}
                        {isDone && <span className="ml-2 text-green-400">✓ Done</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {inProgress && (
                        <ResumeButton folderId={folder.id} folderName={folder.name} />
                      )}
                      <Link
                        href={`/gallery?folderId=${folder.id}&folderName=${encodeURIComponent(folder.name)}`}
                        className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                      >
                        Browse
                      </Link>
                      <Link
                        href={`/slideshow?folderId=${folder.id}&folderName=${encodeURIComponent(folder.name)}`}
                        className="bg-indigo-700 hover:bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                      >
                        {isDone ? "Review again" : "Slideshow"}
                      </Link>
                    </div>
                  </div>
                  {prog && prog.seen > 0 && (
                    <div className="h-1 bg-gray-700">
                      <div
                        className="h-1 bg-indigo-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {folders.length > 1 && (
            <div className="mt-4 bg-indigo-900/40 border border-indigo-700/40 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <span className="font-medium text-lg">All Photos</span>
                  <div className="text-indigo-300 text-sm mt-0.5">
                    {totalPhotos} photos
                    {totalSeen > 0 && (
                      <span className="ml-2">
                        · {totalSeen} reviewed ({Math.round((totalSeen / totalPhotos) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/gallery?folderId=all&folderName=All+Photos`}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  Browse
                </Link>
                <Link
                  href={`/slideshow?folderId=all&folderName=All+Photos`}
                  className="bg-indigo-700 hover:bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  Slideshow
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// small client component just for the resume button (needs fetch)
import ResumeButtonComponent from "@/components/ResumeButton";

function ResumeButton({ folderId, folderName }: { folderId: number; folderName: string }) {
  return <ResumeButtonComponent folderId={folderId} folderName={folderName} />;
}

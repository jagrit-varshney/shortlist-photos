"use client";

import { useState } from "react";

export default function ExportButtons() {
  const [modal, setModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [copying, setCopying] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function download(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.click();
  }

  function openModal() {
    const today = new Date().toISOString().slice(0, 10);
    setFolderName(`shortlist_${today}`);
    setResult(null);
    setModal(true);
  }

  async function handleCopy() {
    setCopying(true);
    setResult(null);
    try {
      const res = await fetch("/api/export/copy-to-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? "Copy failed" });
      } else {
        setResult({ ok: true, message: `${data.copied} photos copied to "${data.folderName}"` });
      }
    } catch {
      setResult({ ok: false, message: "Network error" });
    }
    setCopying(false);
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => download("/api/export/csv")}
          className="text-sm px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
        >
          Export CSV
        </button>
        <button
          onClick={() => download("/api/export/txt")}
          className="text-sm px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
        >
          Export TXT
        </button>
        <button
          onClick={openModal}
          className="text-sm px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white transition-colors"
        >
          Copy to folder
        </button>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Copy shortlist to folder</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
            </div>

            {!result ? (
              <>
                <p className="text-gray-400 text-sm mb-4">
                  All shortlisted photos will be copied into a new subfolder inside <code className="bg-gray-700 px-1 rounded text-xs">PHOTOS_ROOT</code>.
                </p>
                <label className="block text-sm text-gray-400 mb-1">Folder name</label>
                <input
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 mb-5"
                  placeholder="shortlist_2026-06-09"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCopy}
                    disabled={copying || !folderName.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors"
                  >
                    {copying ? "Copying…" : "Copy"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={`px-4 py-3 rounded-xl text-sm mb-5 ${result.ok ? "bg-green-900/50 border border-green-700 text-green-300" : "bg-red-900/50 border border-red-700 text-red-300"}`}>
                  {result.message}
                </div>
                <button
                  onClick={() => setModal(false)}
                  className="w-full py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

"use client";

export default function ExportButtons() {
  function download(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.click();
  }

  return (
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
    </div>
  );
}

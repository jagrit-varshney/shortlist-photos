import Header from "@/components/Header";
import ShortlistGrid from "@/components/ShortlistGrid";

export default function ShortlistPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Header />
      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Shortlist</h1>
          </div>
          <ShortlistGrid />
        </div>
      </main>
    </div>
  );
}

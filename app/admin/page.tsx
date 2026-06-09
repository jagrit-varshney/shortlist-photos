import Header from "@/components/Header";
import AdminPanel from "@/components/AdminPanel";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Header />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Admin</h1>
          <AdminPanel />
        </div>
      </main>
    </div>
  );
}

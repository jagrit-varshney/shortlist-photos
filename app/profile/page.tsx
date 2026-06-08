import Header from "@/components/Header";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Header />
      <main className="flex-1 p-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-6">Change password</h1>
          <ChangePasswordForm />
        </div>
      </main>
    </div>
  );
}

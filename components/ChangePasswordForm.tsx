"use client";

import { useState } from "react";

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next !== confirm) { setError("Passwords do not match"); return; }
    if (next.length < 6) { setError("New password must be at least 6 characters"); return; }

    setLoading(true);
    const res = await fetch("/api/profile/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to update password");
      return;
    }

    setSuccess(true);
    setCurrent(""); setNext(""); setConfirm("");
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-6">
      {success && (
        <div className="mb-4 px-4 py-3 bg-green-900/50 border border-green-700 rounded-xl text-green-300 text-sm">
          Password updated successfully.
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Current password</label>
          <input
            type="password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">New password</label>
          <input
            type="password"
            required
            minLength={6}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Confirm new password</label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold transition-colors"
        >
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "user";
  created_at: string;
}

type Modal =
  | { type: "create" }
  | { type: "reset"; user: User }
  | { type: "delete"; user: User }
  | null;

export default function AdminPanel() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleDelete(user: User) {
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Delete failed");
      return;
    }
    setModal(null);
    flash(`${user.name} deleted`);
    loadUsers();
  }

  return (
    <div>
      {success && (
        <div className="mb-4 px-4 py-3 bg-green-900/50 border border-green-700 rounded-xl text-green-300 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-900/50 border border-red-700 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* User list */}
      <div className="bg-gray-800 rounded-xl overflow-hidden mb-6">
        {loading ? (
          <div className="p-6 text-gray-500 text-center">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-700/50 last:border-0">
                  <td className="px-4 py-3 text-white font-medium">
                    {u.name}
                    {String(u.id) === currentUserId && (
                      <span className="ml-2 text-xs text-indigo-400">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.role === "admin"
                          ? "bg-indigo-900 text-indigo-300"
                          : "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setModal({ type: "reset", user: u })}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                      >
                        Reset password
                      </button>
                      {String(u.id) !== currentUserId && (
                        <button
                          onClick={() => { setError(""); setModal({ type: "delete", user: u }); }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800 text-red-300 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button
        onClick={() => { setError(""); setModal({ type: "create" }); }}
        className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
      >
        + Add user
      </button>

      {/* Modals */}
      {modal?.type === "create" && (
        <CreateUserModal
          onClose={() => setModal(null)}
          onCreated={() => { loadUsers(); flash("User created"); setModal(null); }}
          onError={setError}
        />
      )}
      {modal?.type === "reset" && (
        <ResetPasswordModal
          user={modal.user}
          onClose={() => setModal(null)}
          onDone={() => { flash(`Password reset for ${modal.user.name}`); setModal(null); }}
          onError={setError}
        />
      )}
      {modal?.type === "delete" && (
        <ConfirmDeleteModal
          user={modal.user}
          onClose={() => setModal(null)}
          onConfirm={() => handleDelete(modal.user)}
        />
      )}
    </div>
  );
}

// ── Create User Modal ──────────────────────────────────────────

function CreateUserModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: () => void;
  onError: (e: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      onError(d.error ?? "Failed to create user");
      return;
    }
    onCreated();
  }

  return (
    <Modal title="Add user" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="Priya Sharma"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="priya@example.com"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder="min 6 characters"
          />
        </Field>
        <Field label="Role">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "user" | "admin")}
            className={inputCls}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className={secondaryCls}>Cancel</button>
          <button type="submit" disabled={loading} className={primaryCls}>
            {loading ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Reset Password Modal ───────────────────────────────────────

function ResetPasswordModal({
  user,
  onClose,
  onDone,
  onError,
}: {
  user: User;
  onClose: () => void;
  onDone: () => void;
  onError: (e: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      onError(d.error ?? "Reset failed");
      return;
    }
    onDone();
  }

  return (
    <Modal title={`Reset password — ${user.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="New password">
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder="min 6 characters"
          />
        </Field>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className={secondaryCls}>Cancel</button>
          <button type="submit" disabled={loading} className={primaryCls}>
            {loading ? "Saving…" : "Set password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Confirm Delete Modal ───────────────────────────────────────

function ConfirmDeleteModal({
  user,
  onClose,
  onConfirm,
}: {
  user: User;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="Delete user" onClose={onClose}>
      <p className="text-gray-300 mb-6">
        Delete <span className="font-semibold text-white">{user.name}</span>? Their progress and shortlist contributions will be preserved.
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className={secondaryCls}>Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-colors">
          Delete
        </button>
      </div>
    </Modal>
  );
}

// ── Shared primitives ──────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-gray-700 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500";
const primaryCls = "flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors";
const secondaryCls = "flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors";

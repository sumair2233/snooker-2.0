"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { User, UserRole } from "@/types";
import { Users, UserPlus, Shield, KeyRound, Check, X, Edit2, Lock } from "lucide-react";
import { useSession } from "next-auth/react";

export default function EmployeesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [pin, setPin] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error("Fetch employees error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const openAddModal = () => {
    setEditingUser(null);
    setName("");
    setUsername("");
    setRole("employee");
    setPin("");
    setActive(true);
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setRole(user.role);
    setPin("");
    setActive(user.active);
    setError("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      setError("Please fill in staff name and username");
      return;
    }
    if (!editingUser && !pin.trim()) {
      setError("Please enter a PIN for the new account");
      return;
    }

    try {
      const isEditing = Boolean(editingUser);
      const url = "/api/employees";
      const method = isEditing ? "PUT" : "POST";

      const bodyPayload = isEditing
        ? { id: editingUser?.id, name, username, role, active, pin: pin.trim() || undefined }
        : { name, username, role, active, pin: pin.trim() };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save employee");
      }

      setIsModalOpen(false);
      fetchEmployees();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving account");
    }
  };

  const toggleStatus = async (user: User) => {
    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, active: !user.active }),
      });
      if (res.ok) fetchEmployees();
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  return (
    <AppShell title="Staff & Access Management">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-amber-400">👥</span> Staff Accounts & Role Credentials
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage admin and employee accounts, reset PINs, and grant station access
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-950 shadow-md transition-all active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Staff Account</span>
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-xl">
        <div className="overflow-x-auto rounded-xl border border-emerald-950">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#091510] text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-emerald-950">
              <tr>
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Username / Staff ID</th>
                <th className="py-3 px-3">System Role</th>
                <th className="py-3 px-3">Created</th>
                <th className="py-3 px-3">Account Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/60 bg-[#07130e]">
              {employees.map((user) => (
                <tr key={user.id} className="hover:bg-[#0c1f15] transition-colors">
                  <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950 text-xs font-bold text-amber-400 border border-emerald-800">
                      {user.name.charAt(0)}
                    </span>
                    <span>{user.name}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-gray-300">
                    @{user.username}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        user.role === "admin"
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-400">
                    {user.created_at ? user.created_at.split("T")[0] : "-"}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        user.active
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-rose-950 text-rose-400 border border-rose-800"
                      }`}
                    >
                      {user.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right space-x-1.5">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded-lg bg-[#0e2417] hover:bg-[#163824] px-2.5 py-1 text-[11px] font-semibold text-amber-300 border border-emerald-800"
                        >
                          Edit / PIN
                        </button>
                        <button
                          onClick={() => toggleStatus(user)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border ${
                            user.active
                              ? "bg-rose-950/40 text-rose-300 border-rose-800 hover:bg-rose-900/50"
                              : "bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50"
                          }`}
                        >
                          {user.active ? "Deactivate" : "Activate"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#0a1811] p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1">
              {editingUser ? "Edit Staff Account" : "Add New Staff Member"}
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Configure name, username, system permissions and login PIN
            </p>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-800/50 bg-rose-950/40 p-2.5 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hamza Staff"
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Username / Staff ID *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. emp786"
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Role Permissions
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="employee">Employee (Counter Operator)</option>
                  <option value="admin">Admin (Manager / Full Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  {editingUser ? "Reset 4-Digit PIN (Leave blank to keep)" : "4-Digit PIN *"}
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="e.g. 7860"
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-amber-500"
                  />
                  <span>Account Active & Permitted to Login</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#163022]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-gray-800 bg-[#0c1812] px-4 py-2 text-xs text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-xs font-bold text-gray-950 shadow"
                >
                  {editingUser ? "Update Account" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

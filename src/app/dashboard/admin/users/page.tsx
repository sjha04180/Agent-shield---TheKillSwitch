"use client";

import React, { useEffect, useState } from "react";
import { useAdminStore } from "@/store/useAdminStore";
import { useNotificationStore } from "@/store/useNotificationStore";

export default function AdminUsersPage() {
  const { users, loading, fetchUsers, toggleUserStatus } = useAdminStore();
  const { addNotification } = useNotificationStore();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    const success = await toggleUserStatus(id, nextStatus);
    if (success) {
      addNotification(
        "User Status Update",
        `User login status successfully updated to ${nextStatus}.`,
        nextStatus === "active" ? "success" : "info"
      );
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Registered Users</h2>
          <p className="text-gray-400 text-xs">Manage administrative access keys, user suspension parameters, and org assignments.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#101827] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-xs font-sans"
            placeholder="Search name or email..."
          />
          <span className="absolute left-3.5 top-2.5 text-xs text-gray-500 font-bold">🔍</span>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1f2937]/85 text-xs text-gray-500 uppercase font-semibold">
                  <th className="px-6 py-4">User Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role Permission</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]/50 text-gray-300">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-[#050816]/30 transition">
                    <td className="px-6 py-4 font-semibold text-white">{user.name}</td>
                    <td className="px-6 py-4 font-mono text-gray-400">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-800 text-gray-400">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        user.status !== "suspended" ? "bg-[#10B981]/15 text-[#10B981]" : "bg-[#EF4444]/15 text-[#EF4444]"
                      }`}>
                        {user.status || "active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(user._id, user.status || "active")}
                        className={`px-3 py-1.5 rounded font-semibold text-[10px] uppercase transition ${
                          (user.status || "active") === "active"
                            ? "bg-red-950/20 border border-red-500/35 hover:bg-red-950/40 text-red-400"
                            : "bg-emerald-950/10 border border-[#10B981]/25 hover:bg-emerald-950/30 text-[#10B981]"
                        }`}
                      >
                        {(user.status || "active") === "active" ? "Suspend" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

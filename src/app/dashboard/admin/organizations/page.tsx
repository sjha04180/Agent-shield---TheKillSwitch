"use client";

import React, { useEffect } from "react";
import { useAdminStore } from "@/store/useAdminStore";
import { useNotificationStore } from "@/store/useNotificationStore";

export default function AdminOrganizationsPage() {
  const { organizations, loading, fetchOrganizations, toggleOrgStatus } = useAdminStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    const success = await toggleOrgStatus(id, nextStatus);
    if (success) {
      addNotification(
        "Organization Update",
        `Organization status changed successfully to ${nextStatus}.`,
        nextStatus === "active" ? "success" : "info"
      );
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-xl font-bold text-white">Organization Management</h2>
        <p className="text-gray-400 text-xs">Verify tenant groups, active smart accounts, and threat indicators.</p>
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
                  <th className="px-6 py-4">Company Name</th>
                  <th className="px-6 py-4">Industry</th>
                  <th className="px-6 py-4">Country</th>
                  <th className="px-6 py-4">Risk Score</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]/50 text-gray-300">
                {organizations.map((org) => (
                  <tr key={org._id} className="hover:bg-[#050816]/30 transition">
                    <td className="px-6 py-4 font-semibold text-white">{org.name}</td>
                    <td className="px-6 py-4">{org.industry}</td>
                    <td className="px-6 py-4">{org.country}</td>
                    <td className="px-6 py-4 font-mono font-bold text-white">{org.riskScore}/100</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        org.status === "active" ? "bg-[#10B981]/15 text-[#10B981]" : "bg-[#EF4444]/15 text-[#EF4444]"
                      }`}>
                        {org.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(org._id, org.status)}
                        className={`px-3 py-1.5 rounded font-semibold text-[10px] uppercase transition ${
                          org.status === "active"
                            ? "bg-red-950/20 border border-red-500/35 hover:bg-red-950/40 text-red-400"
                            : "bg-emerald-950/10 border border-[#10B981]/25 hover:bg-emerald-950/30 text-[#10B981]"
                        }`}
                      >
                        {org.status === "active" ? "Suspend" : "Activate"}
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

"use client";

import React, { useEffect } from "react";
import { useAdminStore } from "@/store/useAdminStore";

export default function AdminDashboardPage() {
  const { metrics, loading, fetchAdminDashboard } = useAdminStore();

  useEffect(() => {
    fetchAdminDashboard();
  }, []);

  return (
    <div className="space-y-6 font-sans">
      {/* Overview Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Enterprise Security Operations Center</h2>
        <p className="text-gray-400 text-xs mt-0.5">Unified platform metrics for connected entities, threat indicators, and policy validations.</p>
      </div>

      {loading || !metrics ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Metrics Grids */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Total Organizations</span>
              <span className="text-2xl font-bold text-white mt-1 block font-mono">{metrics.stats.orgCount}</span>
            </div>

            <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Connected Wallets</span>
              <span className="text-2xl font-bold text-white mt-1 block font-mono">{metrics.stats.walletCount}</span>
            </div>

            <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Running AI Agents</span>
              <span className="text-2xl font-bold text-emerald-400 mt-1 block font-mono">{metrics.stats.activeAgents}</span>
            </div>

            <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Blocked Threats</span>
              <span className="text-2xl font-bold text-red-400 mt-1 block font-mono">{metrics.stats.blockedTransactions}</span>
            </div>
          </div>

          {/* Core Layout split: stats & feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#101827] border border-[#1f2937]/80 rounded-2xl p-6 shadow-glow">
              <h3 className="text-sm font-bold text-white mb-5">Recent Policy Evaluations</h3>
              {metrics.recentLogs.length === 0 ? (
                <p className="text-xs text-gray-500">No evaluations registered in verification history.</p>
              ) : (
                <div className="space-y-4">
                  {metrics.recentLogs.map((log: any) => (
                    <div key={log._id} className="p-3 bg-[#050816] border border-[#1f2937]/50 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="text-white font-semibold block">Recipient: {log.recipient.slice(0, 10)}...</span>
                        <span className="text-[10px] text-gray-500 font-mono">Amount: {log.amount} ETH | Risk Score: {log.riskScore}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        log.status === "Approved" ? "bg-emerald-950 text-emerald-400" : "bg-red-950/20 text-red-400"
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#101827] border border-[#1f2937]/80 rounded-2xl p-6 shadow-glow space-y-4">
              <h3 className="text-sm font-bold text-white">Console System Status</h3>
              <ul className="space-y-3 text-xs text-gray-400">
                <li className="flex justify-between border-b border-[#1f2937]/50 pb-2">
                  <span>API Proxy Server:</span>
                  <span className="text-emerald-400 font-semibold">Active</span>
                </li>
                <li className="flex justify-between border-b border-[#1f2937]/50 pb-2">
                  <span>Mongoose Host:</span>
                  <span className="text-emerald-400 font-semibold">Healthy</span>
                </li>
                <li className="flex justify-between pb-2">
                  <span>Security Rulesets:</span>
                  <span className="text-white font-mono">{metrics.stats.blockedTransactions + metrics.stats.successfulTransactions} evaluated</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

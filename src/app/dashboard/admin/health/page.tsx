"use client";

import React, { useEffect } from "react";
import { useSystemHealthStore } from "@/store/useSystemHealthStore";

export default function AdminHealthPage() {
  const { health, loading, fetchHealth } = useSystemHealthStore();

  useEffect(() => {
    fetchHealth();
    // Poll system health metrics every 5 seconds to feel live!
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-xl font-bold text-white">System Diagnostics & Health Monitor</h2>
        <p className="text-gray-400 text-xs">Observe live connection statuses, memory allocations, and database response latency.</p>
      </div>

      {loading && !health ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
        </div>
      ) : health ? (
        <div className="space-y-6">
          {/* Health check status badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">API Proxy</span>
              <span className="text-sm font-bold text-emerald-400 mt-1.5 block uppercase">
                {health.apiStatus === "healthy" ? "● Operational" : "● Anomaly"}
              </span>
            </div>

            <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Database</span>
              <span className="text-sm font-bold text-emerald-400 mt-1.5 block uppercase">
                {health.dbStatus === "healthy" ? "● Healthy" : "● Warning"}
              </span>
            </div>

            <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Blockchain RPC</span>
              <span className="text-sm font-bold text-emerald-400 mt-1.5 block uppercase">
                {health.blockchainStatus === "healthy" ? "● Operational" : "● Down"}
              </span>
            </div>

            <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Gemini API Status</span>
              <span className="text-sm font-bold text-emerald-400 mt-1.5 block uppercase">
                {health.geminiStatus === "healthy" ? "● Connected" : "● Offline"}
              </span>
            </div>

            <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Lyzr AI Gateway</span>
              <span className="text-sm font-bold text-emerald-400 mt-1.5 block uppercase">
                {health.lyzrStatus === "healthy" ? "● Connected" : "● Disconnected"}
              </span>
            </div>

            <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Internal Simulator</span>
              <span className="text-sm font-bold text-emerald-400 mt-1.5 block uppercase">
                {health.simulatorStatus === "healthy" ? "● Active" : "● Error"}
              </span>
            </div>

            <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">MetaMask RPC</span>
              <span className="text-sm font-bold text-emerald-400 mt-1.5 block uppercase">
                {health.metaMaskStatus === "healthy" ? "● Operational" : "● Unstable"}
              </span>
            </div>

            <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">System Version</span>
              <span className="text-sm font-bold text-[#2563EB] mt-1.5 block uppercase">
                v{health.version || "1.0.0"}
              </span>
            </div>
          </div>

          {/* Sizing telemetry specs */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-3">API Request Latency</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white font-mono">{health.apiLatencyMs || 25}</span>
                <span className="text-xs text-gray-400">ms</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">API gateway response time.</p>
            </div>

            <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-3">Database Latency</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white font-mono">{health.responseTime}</span>
                <span className="text-xs text-gray-400">ms</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">Time to complete query execution.</p>
            </div>

            <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-3">Server CPU Memory</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white font-mono">{health.memoryUsage}%</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">Resource allocation percentage.</p>
            </div>

            <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-3">Storage Allocation</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white font-mono">{health.storageUsage}%</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">Available logs storage.</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500">No telemetry log available.</p>
      )}
    </div>
  );
}

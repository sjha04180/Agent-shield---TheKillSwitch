"use client";

import React, { useMemo } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";

export default function DashboardIndex() {
  const { user } = useAuthStore();
  const { wallets, freezeDbWallet, unfreezeDbWallet } = useWalletStore();
  const { notifications } = useNotificationStore();

  const totalWallets = wallets.length;
  const activeWallets = wallets.filter(w => w.status === 'active').length;
  const frozenWallets = wallets.filter(w => w.status === 'frozen').length;
  
  // Calculate mock security score based on active vs frozen wallets
  const securityScore = useMemo(() => {
    if (totalWallets === 0) return 100;
    const pctActive = (activeWallets / totalWallets) * 100;
    return Math.round(pctActive);
  }, [totalWallets, activeWallets]);

  // Mock list of recent transactions
  const mockActivities = [
    { id: '1', type: 'TX_PROPOSAL_BLOCKED', title: 'Tx Blocked (Policy Breach)', detail: 'Agent proposed sending 5 ETH to unwhitelisted address', time: '5 mins ago', status: 'blocked' },
    { id: '2', type: 'TX_EXECUTED', title: 'Tx Executed successfully', detail: 'Agent spent 0.02 ETH on Gas Relayer payment', time: '12 mins ago', status: 'success' },
    { id: '3', type: 'POLICY_MODIFIED', title: 'Max Limit Modified', detail: 'User updated Hourly spending limits to 1.5 ETH', time: '1 hour ago', status: 'info' }
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Console Dashboard</h2>
          <p className="text-gray-400 text-sm">Welcome back, <span className="text-[#2563EB] font-medium">{user?.name}</span> ({user?.role})</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/wallets"
            className="px-4 py-2 text-xs font-semibold bg-[#2563EB]/15 text-[#2563EB] border border-[#2563EB]/30 rounded-xl hover:bg-[#2563EB]/25 transition"
          >
            + Register Wallet
          </Link>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Connected Wallets */}
        <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl relative overflow-hidden shadow-glow">
          <div className="absolute top-4 right-4 text-xl">💳</div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Registered Wallets</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{totalWallets}</span>
            <span className="text-xs text-gray-400">Total</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">{activeWallets} active • {frozenWallets} frozen</p>
        </div>

        {/* Active Agents */}
        <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl relative overflow-hidden shadow-glow">
          <div className="absolute top-4 right-4 text-xl">🤖</div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Active AI Agents</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">2</span>
            <span className="text-xs text-gray-400">Simulated</span>
          </div>
          <p className="text-xs text-[#10B981] mt-2">● Enforcing out-of-band policies</p>
        </div>

        {/* Blocked Tx */}
        <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl relative overflow-hidden shadow-glow">
          <div className="absolute top-4 right-4 text-xl">🛑</div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Blocked Transactions</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">1</span>
            <span className="text-xs text-gray-400">Detected</span>
          </div>
          <p className="text-xs text-[#EF4444] mt-2">⚠ Anomaly flagged by Gemini pre-guard</p>
        </div>

        {/* Security Score */}
        <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl relative overflow-hidden shadow-glow">
          <div className="absolute top-4 right-4 text-xl">🛡️</div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Governance Status</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${securityScore < 50 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
              {securityScore}%
            </span>
            <span className="text-xs text-gray-400">Secured</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Based on active vs frozen accounts</p>
        </div>
      </div>

      {/* Main Grid: Split column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Wallets list & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Wallet List */}
          <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
            <h3 className="text-md font-bold text-white mb-4">Governed Wallets</h3>
            {wallets.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-3xl block mb-2">📥</span>
                <p className="text-gray-400 text-sm">No wallets registered yet.</p>
                <Link href="/dashboard/wallets" className="mt-4 inline-block text-xs font-semibold text-[#2563EB] hover:underline">
                  Connect MetaMask or Register custom addresses
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {wallets.map((w) => (
                  <div key={w._id} className="flex justify-between items-center p-4 bg-[#050816] rounded-xl border border-[#1f2937]/80">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{w.name}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                          {w.walletType}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-gray-500 block mt-1">{w.address}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-bold capitalize ${
                        w.status === 'active' ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#EF4444]/15 text-[#EF4444]'
                      }`}>
                        {w.status}
                      </span>
                      {w.status === 'active' ? (
                        <button
                          onClick={() => freezeDbWallet(w._id)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-[#EF4444]/15 text-[#EF4444] rounded hover:bg-[#EF4444]/25 transition"
                        >
                          Freeze
                        </button>
                      ) : (
                        <button
                          onClick={() => unfreezeDbWallet(w._id)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-[#10B981]/15 text-[#10B981] rounded hover:bg-[#10B981]/25 transition"
                        >
                          Unfreeze
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Security logs */}
          <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
            <h3 className="text-md font-bold text-white mb-4">Recent Audit Activity</h3>
            <div className="space-y-4">
              {mockActivities.map((act) => (
                <div key={act.id} className="flex gap-4 p-3 hover:bg-[#050816]/50 rounded-xl transition">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#050816] flex items-center justify-center text-sm">
                    {act.status === 'blocked' ? '🛑' : act.status === 'success' ? '✅' : '⚙️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{act.title}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{act.detail}</p>
                  </div>
                  <div className="text-right text-[10px] text-gray-500">{act.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Security Notifications & Quick Actions */}
        <div className="space-y-6">
          {/* Platform Status */}
          <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
            <h3 className="text-md font-bold text-white mb-4">Security Policy Status</h3>
            <ul className="space-y-3.5 text-sm text-gray-400">
              <li className="flex justify-between items-center">
                <span>Off-Chain Validation Proxy</span>
                <span className="text-[#10B981] font-semibold">ONLINE</span>
              </li>
              <li className="flex justify-between items-center">
                <span>Gemini API Explainer API</span>
                <span className="text-[#10B981] font-semibold">ONLINE</span>
              </li>
              <li className="flex justify-between items-center">
                <span>On-Chain Guard Modules</span>
                <span className="text-gray-500 font-semibold font-mono">2 DEPLOYED</span>
              </li>
              <li className="flex justify-between items-center">
                <span>Active Spending Polices</span>
                <span className="text-[#2563EB] font-semibold">3 CONFIGURED</span>
              </li>
            </ul>
          </div>

          {/* Dynamic notifications */}
          <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow max-h-96 overflow-y-auto">
            <h3 className="text-md font-bold text-white mb-4">Live Alerts</h3>
            {notifications.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No notifications.</p>
            ) : (
              <div className="space-y-4">
                {notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="p-3 bg-[#050816]/70 border border-[#1f2937]/50 rounded-xl">
                    <span className="text-xs font-semibold text-white block mb-0.5">{n.title}</span>
                    <span className="text-xs text-gray-400 leading-relaxed block">{n.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

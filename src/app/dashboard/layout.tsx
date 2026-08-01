"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useWalletStore } from "@/store/useWalletStore";
import { useNotificationStore } from "@/store/useNotificationStore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  
  const { user, fetchProfile, loading } = useAuthStore();
  const { metaMaskAddress, metaMaskConnected, connectMetaMask, disconnectMetaMask, wallets, fetchDbWallets, freezeDbWallet } = useWalletStore();
  const { notifications, addNotification } = useNotificationStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchDbWallets();
  }, [fetchProfile, fetchDbWallets]);

  // Master Kill Switch trigger - Freezes all wallets registered for this user
  const handleMasterKillSwitch = async () => {
    const confirm = window.confirm("WARNING: You are activating the Master Kill Switch. This will immediately freeze all associated wallets and block all autonomous AI agent executions. Continue?");
    if (!confirm) return;

    let frozenCount = 0;
    for (const wallet of wallets) {
      if (wallet.status === 'active') {
        const success = await freezeDbWallet(wallet._id);
        if (success) frozenCount++;
      }
    }

    addNotification(
      "MASTER KILL SWITCH TRIGGERED",
      `Emergency halt activated. ${frozenCount} wallets frozen.`,
      "error"
    );
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#050816] text-gray-100 font-sans">
      {/* Sidebar Navigation */}
      <aside className={`bg-[#101827] border-r border-[#1f2937]/80 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} relative z-30`}>
        {/* Logo / Header */}
        <div className="h-16 border-b border-[#1f2937]/80 flex items-center px-5 gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#2563EB] to-[#10B981] flex items-center justify-center font-bold text-white shadow-glow flex-shrink-0">
            A
          </div>
          {sidebarOpen && (
            <span className="font-semibold tracking-wider text-sm text-white">Agent<span className="text-[#2563EB]">Shield</span></span>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              pathname === "/dashboard"
                ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
            }`}
          >
            <span className="text-lg">📊</span>
            {sidebarOpen && <span>Overview</span>}
          </Link>

          <Link
            href="/dashboard/agents"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              pathname === "/dashboard/agents"
                ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
            }`}
          >
            <span className="text-lg">🤖</span>
            {sidebarOpen && <span>Agents Console</span>}
          </Link>

          <Link
            href="/dashboard/agents/connected"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              pathname === "/dashboard/agents/connected"
                ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
            }`}
          >
            <span className="text-lg">🌐</span>
            {sidebarOpen && <span>Connected Agents</span>}
          </Link>

          <Link
            href="/dashboard/policies"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              pathname === "/dashboard/policies"
                ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
            }`}
          >
            <span className="text-lg">📜</span>
            {sidebarOpen && <span>Policies Builder</span>}
          </Link>

          <Link
            href="/dashboard/simulator"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              pathname === "/dashboard/simulator"
                ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
            }`}
          >
            <span className="text-lg">🚨</span>
            {sidebarOpen && <span>Attack Simulator</span>}
          </Link>

          <Link
            href="/dashboard/audit"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              pathname === "/dashboard/audit"
                ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
            }`}
          >
            <span className="text-lg">🔍</span>
            {sidebarOpen && <span>Audit Ledger</span>}
          </Link>

          <Link
            href="/dashboard/blockchain"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              pathname === "/dashboard/blockchain"
                ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
            }`}
          >
            <span className="text-lg">⛓️</span>
            {sidebarOpen && <span>Blockchain Console</span>}
          </Link>

          <Link
            href="/dashboard/copilot"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              pathname === "/dashboard/copilot"
                ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
            }`}
          >
            <span className="text-lg">🤖</span>
            {sidebarOpen && <span>Security Copilot</span>}
          </Link>

          <Link
            href="/dashboard/wallets"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              pathname === "/dashboard/wallets"
                ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
            }`}
          >
            <span className="text-lg">💳</span>
            {sidebarOpen && <span>Wallets</span>}
          </Link>

          <Link
            href="/dashboard/profile"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              pathname === "/dashboard/profile"
                ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
            }`}
          >
            <span className="text-lg">👤</span>
            {sidebarOpen && <span>Profile</span>}
          </Link>

          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              pathname === "/dashboard/settings"
                ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
            }`}
          >
            <span className="text-lg">⚙️</span>
            {sidebarOpen && <span>Settings</span>}
          </Link>

          {user && user.role === "admin" && (
            <div className="border-t border-[#1f2937]/50 pt-4 mt-4 space-y-1.5">
              <div className="px-3 mb-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                {sidebarOpen ? "Admin Console" : "ADM"}
              </div>
              <Link
                href="/dashboard/admin"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  pathname === "/dashboard/admin"
                    ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                    : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
                }`}
              >
                <span className="text-lg">🛡️</span>
                {sidebarOpen && <span>Overview</span>}
              </Link>
              <Link
                href="/dashboard/admin/organizations"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  pathname === "/dashboard/admin/organizations"
                    ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                    : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
                }`}
              >
                <span className="text-lg">🏢</span>
                {sidebarOpen && <span>Organizations</span>}
              </Link>
              <Link
                href="/dashboard/admin/users"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  pathname === "/dashboard/admin/users"
                    ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                    : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
                }`}
              >
                <span className="text-lg">👥</span>
                {sidebarOpen && <span>Users</span>}
              </Link>
              <Link
                href="/dashboard/admin/security"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  pathname === "/dashboard/admin/security"
                    ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                    : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
                }`}
              >
                <span className="text-lg">⚡</span>
                {sidebarOpen && <span>Security SOC</span>}
              </Link>
              <Link
                href="/dashboard/admin/reports"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  pathname === "/dashboard/admin/reports"
                    ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                    : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
                }`}
              >
                <span className="text-lg">📄</span>
                {sidebarOpen && <span>System Reports</span>}
              </Link>
              <Link
                href="/dashboard/admin/health"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  pathname === "/dashboard/admin/health"
                    ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                    : "text-gray-400 hover:text-white hover:bg-[#101827]/60"
                }`}
              >
                <span className="text-lg">💓</span>
                {sidebarOpen && <span>Diagnostics</span>}
              </Link>
            </div>
          )}
        </nav>

        {/* Master Kill Switch Button at Sidebar Bottom */}
        <div className="p-4 border-t border-[#1f2937]/80">
          <button
            onClick={handleMasterKillSwitch}
            className={`w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition flex items-center justify-center gap-2 shadow-glow-danger ${
              sidebarOpen ? 'px-4 text-sm' : 'p-2 text-xl'
            }`}
            title="Trigger Master Kill Switch"
          >
            <span>🚨</span>
            {sidebarOpen && <span>THE KILL SWITCH</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Space */}
      <div className="flex-1 flex flex-col overflow-x-hidden min-h-screen">
        {/* Top Header Navigation */}
        <header className="h-16 bg-[#101827] border-b border-[#1f2937]/80 flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-[#050816] text-gray-400 hover:text-white transition"
            >
              ☰
            </button>
            <h1 className="font-semibold text-lg text-white">
              {pathname === "/dashboard" && "Console Overview"}
              {pathname === "/dashboard/wallets" && "Wallet Management"}
              {pathname === "/dashboard/profile" && "Edit User Profile"}
              {pathname === "/dashboard/settings" && "Platform Settings"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Web3 MetaMask Connection Button */}
            {metaMaskConnected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 text-xs font-semibold text-[#10B981]">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                {metaMaskAddress ? `${metaMaskAddress.slice(0, 6)}...${metaMaskAddress.slice(-4)}` : "Connected"}
                <button
                  onClick={disconnectMetaMask}
                  className="ml-2 text-gray-400 hover:text-white font-mono hover:underline"
                  title="Disconnect MetaMask"
                >
                  [x]
                </button>
              </div>
            ) : (
              <button
                onClick={connectMetaMask}
                className="px-3.5 py-1.5 text-xs font-semibold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl transition shadow-glow flex items-center gap-1.5"
              >
                🦊 Connect MetaMask
              </button>
            )}

            {/* Profile Avatar Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#10B981] text-white flex items-center justify-center font-bold text-sm shadow-glow focus:outline-none"
              >
                {user?.name ? user.name[0]?.toUpperCase() : "U"}
              </button>
              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2.5 w-48 bg-[#101827] border border-[#1f2937] rounded-xl shadow-xl py-2 z-20">
                    <div className="px-4 py-2 border-b border-[#1f2937]/80">
                      <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#2563EB]/10 text-[#2563EB] capitalize">
                        {user?.role}
                      </span>
                    </div>
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#050816] transition"
                    >
                      My Profile
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#050816] transition"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-[#050816] transition border-t border-[#1f2937]/50 mt-1"
                    >
                      Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* View Content Port */}
        <main className="flex-1 p-6 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#050816]/50">
              <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

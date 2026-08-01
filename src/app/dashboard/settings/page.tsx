"use client";

import React, { useState } from "react";
import { useThemeStore } from "@/store/useThemeStore";
import { useWalletStore } from "@/store/useWalletStore";
import { useNotificationStore } from "@/store/useNotificationStore";

export default function SettingsPage() {
  const { isDark, toggleTheme } = useThemeStore();
  const { metaMaskConnected, metaMaskAddress } = useWalletStore();
  const { addNotification } = useNotificationStore();

  // Local settings options
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [toastAlerts, setToastAlerts] = useState(true);
  const [anomalyDetections, setAnomalyDetections] = useState(true);

  const handleSaveSettings = () => {
    addNotification("Settings Saved", "Your workspace settings have been synchronized.", "success");
  };

  const handleDeleteAccount = () => {
    const confirm = window.confirm("WARNING: Are you absolutely sure you want to delete your account? This action is permanent and will delete all governed policies and databases.");
    if (confirm) {
      alert("Delete account is protected. Please contact the platform administrator to revoke credentials.");
    }
  };

  return (
    <div className="max-w-2xl space-y-6 font-sans">
      {/* 1. Styling & Theme Settings */}
      <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
        <h3 className="text-md font-bold text-white mb-2">Interface Customization</h3>
        <p className="text-xs text-gray-500 mb-4">Set preferred visuals for displaying dashboards and tables.</p>
        <div className="flex justify-between items-center py-2">
          <div>
            <span className="text-sm font-semibold text-white block">Dark First Mode</span>
            <span className="text-xs text-gray-400">AgentShield forces high-contrast colors by default to preserve branding consistency.</span>
          </div>
          <button
            disabled
            className="w-12 h-6 rounded-full bg-[#2563EB]/40 border border-[#2563EB]/50 flex items-center px-1 cursor-not-allowed opacity-75"
          >
            <div className="w-4 h-4 rounded-full bg-white translate-x-6" />
          </button>
        </div>
      </div>

      {/* 2. Notification Rules */}
      <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
        <h3 className="text-md font-bold text-white mb-2">Notification Center</h3>
        <p className="text-xs text-gray-500 mb-4">Choose what security channels receive alerts for agent executions.</p>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center py-1">
            <div>
              <span className="text-sm font-semibold text-white block">Real-time Browser Toasts</span>
              <span className="text-xs text-gray-400">Receive flash popups on transaction validation failures.</span>
            </div>
            <input
              type="checkbox"
              checked={toastAlerts}
              onChange={(e) => setToastAlerts(e.target.checked)}
              className="w-4 h-4 bg-[#050816] rounded border-[#1f2937] text-[#2563EB]"
            />
          </div>

          <div className="flex justify-between items-center py-1 border-t border-[#1f2937]/50 pt-3">
            <div>
              <span className="text-sm font-semibold text-white block">Email Dispatch Reports</span>
              <span className="text-xs text-gray-400">Dispatch logs daily summarizing blocked anomaly proposals.</span>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 bg-[#050816] rounded border-[#1f2937] text-[#2563EB]"
            />
          </div>

          <div className="flex justify-between items-center py-1 border-t border-[#1f2937]/50 pt-3">
            <div>
              <span className="text-sm font-semibold text-white block">Gemini Risk Warning Headers</span>
              <span className="text-xs text-gray-400">Flag transaction payloads presenting high risk scores.</span>
            </div>
            <input
              type="checkbox"
              checked={anomalyDetections}
              onChange={(e) => setAnomalyDetections(e.target.checked)}
              className="w-4 h-4 bg-[#050816] rounded border-[#1f2937] text-[#2563EB]"
            />
          </div>
        </div>
      </div>

      {/* 3. Connected Web3 accounts */}
      <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
        <h3 className="text-md font-bold text-white mb-2">Web3 Credentials</h3>
        <p className="text-xs text-gray-500 mb-4">Verification wallets linked to governance authorizations.</p>
        <div className="flex justify-between items-center p-3 bg-[#050816] rounded-xl border border-[#1f2937]/80">
          <span className="text-xs text-gray-400">MetaMask Link Status</span>
          <span className={`text-xs font-mono font-bold uppercase ${metaMaskConnected ? 'text-[#10B981]' : 'text-gray-500'}`}>
            {metaMaskConnected ? `Linked: ${metaMaskAddress?.slice(0, 8)}...` : 'Not connected'}
          </span>
        </div>
      </div>

      {/* 4. Settings save and delete */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleDeleteAccount}
          className="px-4 py-2.5 rounded-xl bg-red-950/20 border border-red-500/35 hover:bg-red-950/40 text-red-400 text-xs font-semibold transition"
        >
          🗑️ Delete Governance Account
        </button>
        <button
          onClick={handleSaveSettings}
          className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold transition shadow-glow"
        >
          Save Configurations
        </button>
      </div>
    </div>
  );
}

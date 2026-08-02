"use client";

import React, { useEffect, useState } from "react";
import { useSettingsStore, SystemSettings } from "@/store/useSettingsStore";
import { useWalletStore } from "@/store/useWalletStore";
import { useNotificationStore } from "@/store/useNotificationStore";

export default function SettingsPage() {
  const { metaMaskConnected, metaMaskAddress } = useWalletStore();
  const { addNotification } = useNotificationStore();
  const {
    demoMode,
    lyzrEnabled,
    simulatorSpeed,
    autoDemo,
    blockchainSimulation,
    geminiEnabled,
    loading,
    fetchSettings,
    updateSettings,
    resetDemoData,
    setupDemoData,
  } = useSettingsStore();

  // Local form states
  const [formDemoMode, setFormDemoMode] = useState(true);
  const [formLyzrEnabled, setFormLyzrEnabled] = useState(true);
  const [formSimulatorSpeed, setFormSimulatorSpeed] = useState<"normal" | "fast" | "stress">("normal");
  const [formAutoDemo, setFormAutoDemo] = useState(false);
  const [formBlockchainSim, setFormBlockchainSim] = useState(true);
  const [formGeminiEnabled, setFormGeminiEnabled] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setFormDemoMode(demoMode);
    setFormLyzrEnabled(lyzrEnabled);
    setFormSimulatorSpeed(simulatorSpeed);
    setFormAutoDemo(autoDemo);
    setFormBlockchainSim(blockchainSimulation);
    setFormGeminiEnabled(geminiEnabled);
  }, [demoMode, lyzrEnabled, simulatorSpeed, autoDemo, blockchainSimulation, geminiEnabled]);

  const handleSaveSettings = async () => {
    const success = await updateSettings({
      demoMode: formDemoMode,
      lyzrEnabled: formLyzrEnabled,
      simulatorSpeed: formSimulatorSpeed,
      autoDemo: formAutoDemo,
      blockchainSimulation: formBlockchainSim,
      geminiEnabled: formGeminiEnabled,
    });

    if (success) {
      addNotification("Settings Synchronized", "Your workspace governance properties were updated.", "success");
    } else {
      addNotification("Sync Failed", "Failed to update governance settings on server.", "error");
    }
  };

  const handleResetDemo = async () => {
    const confirm = window.confirm("WARNING: Are you sure you want to reset the Demo Environment? This will delete all organizations, wallets, agents, transactions, and metrics, and seed a clean sandbox organization.");
    if (!confirm) return;

    try {
      const resetSuccess = await resetDemoData();
      if (resetSuccess) {
        const setupSuccess = await setupDemoData();
        if (setupSuccess) {
          addNotification("Demo Environment Reset", "Database scrubbed and seeded with new clean sandbox organization.", "success");
          fetchSettings();
        } else {
          addNotification("Setup Error", "Database cleared but failed to re-seed demo organization.", "error");
        }
      } else {
        addNotification("Reset Error", "Failed to scrub sandbox database.", "error");
      }
    } catch (err) {
      addNotification("Connection Error", "Network timeout resetting demo.", "error");
    }
  };

  return (
    <div className="max-w-2xl space-y-6 font-sans">
      {/* 1. Execution Mode Configuration */}
      <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
        <h3 className="text-md font-bold text-white mb-1.5">Governance Execution Mode</h3>
        <p className="text-xs text-gray-500 mb-4">Choose where transaction requests originate.</p>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setFormDemoMode(true)}
            className={`p-4 rounded-xl border transition text-left flex flex-col justify-between h-24 ${
              formDemoMode
                ? "bg-emerald-950/20 border-emerald-500/40 text-white shadow-glow"
                : "bg-[#050816] border-[#1f2937] text-gray-400 hover:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Demo Mode</span>
            </div>
            <span className="text-[10px] leading-relaxed text-gray-400">
              Run out-of-band policy simulator and wizard guides.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFormDemoMode(false)}
            className={`p-4 rounded-xl border transition text-left flex flex-col justify-between h-24 ${
              !formDemoMode
                ? "bg-blue-950/20 border-blue-500/40 text-white shadow-glow"
                : "bg-[#050816] border-[#1f2937] text-gray-400 hover:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Live Mode</span>
            </div>
            <span className="text-[10px] leading-relaxed text-gray-400">
              Connect external AI agent workflows (Lyzr Gateway).
            </span>
          </button>
        </div>
      </div>

      {/* 2. Simulator Configurations */}
      {formDemoMode && (
        <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow space-y-4">
          <h3 className="text-md font-bold text-white mb-1.5">Demo Simulation Parameters</h3>

          <div className="flex justify-between items-center py-1">
            <div>
              <span className="text-sm font-semibold text-white block">Auto Demo Loop</span>
              <span className="text-xs text-gray-400">Automatically propose transactions continuously.</span>
            </div>
            <input
              type="checkbox"
              checked={formAutoDemo}
              onChange={(e) => setFormAutoDemo(e.target.checked)}
              className="w-4 h-4 bg-[#050816] rounded border-[#1f2937] text-[#2563EB]"
            />
          </div>

          <div className="flex justify-between items-center py-2 border-t border-[#1f2937]/50 pt-3">
            <div>
              <span className="text-sm font-semibold text-white block">Simulator Frequency Speed</span>
              <span className="text-xs text-gray-400">Adjust the interval for simulated proposals.</span>
            </div>
            <select
              value={formSimulatorSpeed}
              onChange={(e) => setFormSimulatorSpeed(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-[#050816] border border-[#1f2937] rounded-xl text-white outline-none focus:border-[#2563EB]"
            >
              <option value="normal">Normal (60s)</option>
              <option value="fast">Fast Demo (15s)</option>
              <option value="stress">Stress Test (3s)</option>
            </select>
          </div>
        </div>
      )}

      {/* 3. Core Governance Modules */}
      <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow space-y-4">
        <h3 className="text-md font-bold text-white mb-1.5">Platform Integrity Modules</h3>

        <div className="flex justify-between items-center py-1">
          <div>
            <span className="text-sm font-semibold text-white block">Blockchain Smart Contracts Sim</span>
            <span className="text-xs text-gray-400">Simulate on-chain execution when Sepolia node is unavailable.</span>
          </div>
          <input
            type="checkbox"
            checked={formBlockchainSim}
            onChange={(e) => setFormBlockchainSim(e.target.checked)}
            className="w-4 h-4 bg-[#050816] rounded border-[#1f2937] text-[#2563EB]"
          />
        </div>

        <div className="flex justify-between items-center py-1 border-t border-[#1f2937]/50 pt-3">
          <div>
            <span className="text-sm font-semibold text-white block">Lyzr AI Gateway Binding</span>
            <span className="text-xs text-gray-400">Expose gateway APIs to incoming Lyzr SDK Webhooks.</span>
          </div>
          <input
            type="checkbox"
            checked={formLyzrEnabled}
            onChange={(e) => setFormLyzrEnabled(e.target.checked)}
            className="w-4 h-4 bg-[#050816] rounded border-[#1f2937] text-[#2563EB]"
          />
        </div>

        <div className="flex justify-between items-center py-1 border-t border-[#1f2937]/50 pt-3">
          <div>
            <span className="text-sm font-semibold text-white block">Gemini Risk Reasoning Engine</span>
            <span className="text-xs text-gray-400">Leverage Gemini model to explain blocked policy anomalies.</span>
          </div>
          <input
            type="checkbox"
            checked={formGeminiEnabled}
            onChange={(e) => setFormGeminiEnabled(e.target.checked)}
            className="w-4 h-4 bg-[#050816] rounded border-[#1f2937] text-[#2563EB]"
          />
        </div>
      </div>

      {/* 4. Settings save and delete */}
      <div className="flex justify-between items-center border-t border-[#1f2937]/50 pt-6">
        <button
          onClick={handleResetDemo}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-red-950/20 border border-red-500/35 hover:bg-red-950/40 text-red-400 text-xs font-semibold transition"
        >
          🔄 Scrub & Reset Sandbox Demo
        </button>
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold transition shadow-glow disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Configurations"}
        </button>
      </div>
    </div>
  );
}

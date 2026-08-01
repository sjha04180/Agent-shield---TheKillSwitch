"use client";

import React, { useState, useEffect } from "react";
import { useNotificationStore } from "@/store/useNotificationStore";

interface DbAgent {
  _id: string;
  name: string;
  status: string;
}

interface ValidationLogRule {
  ruleName: string;
  status: "PASS" | "WARNING" | "FAIL";
  message: string;
}

interface RunResult {
  decision: "Approved" | "Blocked" | "Pending Manual Review";
  riskScore: number;
  reason: string;
  ruleResults: ValidationLogRule[];
  killSwitchTriggered: boolean;
  killSwitchReason?: string;
}

export default function SimulatorPage() {
  const { addNotification } = useNotificationStore();

  const [agents, setAgents] = useState<DbAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [killSwitchDetails, setKillSwitchDetails] = useState<any>(null);
  const [lastResult, setLastResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningScenario, setRunningScenario] = useState<string | null>(null);

  // Form states for manual kill switch trigger
  const [killReason, setKillReason] = useState("");
  const [killModalOpen, setKillModalOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      if (data.success) {
        setAgents(data.data);
        if (data.data.length > 0) {
          setSelectedAgentId(data.data[0]._id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchKillSwitchStatus = async () => {
    try {
      const res = await fetch("/api/kill-switch/status");
      const data = await res.json();
      if (data.success) {
        setKillSwitchActive(data.data.active);
        setKillSwitchDetails(data.data.lastEvent);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([fetchAgents(), fetchKillSwitchStatus()]).then(() => setLoading(false));
  }, []);

  const handleManualActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!killReason) return;
    try {
      const res = await fetch("/api/kill-switch/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: killReason })
      });
      const data = await res.json();
      if (data.success) {
        addNotification("Emergency Halt Triggered", "Global Kill Switch is now ACTIVE.", "error");
        fetchKillSwitchStatus();
        setKillModalOpen(false);
        setKillReason("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deactivateReason) return;
    try {
      const res = await fetch("/api/kill-switch/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deactivateReason })
      });
      const data = await res.json();
      if (data.success) {
        addNotification("Emergency Halt Lifted", "Global Kill Switch is now INACTIVE.", "success");
        fetchKillSwitchStatus();
        setDeactivateModalOpen(false);
        setDeactivateReason("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const runAttackScenario = async (scenario: string) => {
    if (!selectedAgentId) {
      alert("Please select or deploy an AI Agent first.");
      return;
    }

    setRunningScenario(scenario);
    setLastResult(null);

    try {
      const res = await fetch("/api/simulator/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, agentId: selectedAgentId })
      });
      const data = await res.json();

      setRunningScenario(null);

      if (data.success) {
        setLastResult(data.data);
        if (data.data.killSwitchTriggered) {
          addNotification("AUTO KILL SWITCH TRIGGERED", "Critical attack vector blocked automatically.", "error");
          fetchKillSwitchStatus();
        }
      } else {
        alert(data.error?.message || "Failed to execute scenario check");
      }
    } catch (e) {
      setRunningScenario(null);
      console.error(e);
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score < 25) return "text-[#10B981]";
    if (score < 50) return "text-[#F59E0B]";
    if (score < 75) return "text-orange-400";
    return "text-[#EF4444]";
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Global Kill Switch Banner Banner */}
      <div className={`p-6 border rounded-2xl shadow-glow relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        killSwitchActive
          ? "bg-red-950/20 border-red-500/35"
          : "bg-emerald-950/10 border-emerald-500/20"
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`w-3.5 h-3.5 rounded-full ${killSwitchActive ? 'bg-[#EF4444] animate-ping' : 'bg-[#10B981]'}`} />
            <h3 className="text-md font-bold text-white uppercase tracking-wider">
              Emergency Kill Switch Status: {killSwitchActive ? "ACTIVE" : "INACTIVE"}
            </h3>
          </div>
          <p className="text-xs text-gray-400 max-w-xl">
            {killSwitchActive
              ? `Halt triggered. Reason: ${killSwitchDetails?.reason || "Security trigger"} (Activated via ${killSwitchDetails?.triggerType || "system"})`
              : "Platform is secure. Off-chain governance validation proxy is enforcing active policy rules."}
          </p>
        </div>

        <div>
          {killSwitchActive ? (
            <button
              onClick={() => setDeactivateModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-xs transition shadow-glow"
            >
              🔓 Deactivate Kill Switch
            </button>
          ) : (
            <button
              onClick={() => setKillModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-glow-danger"
            >
              🚨 Activate Kill Switch
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Simulation Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Side (Columns 1-2): Scenario selector */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
            <h3 className="text-sm font-bold text-white mb-4">Security Testing Targets</h3>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select Target Agent</label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm font-sans"
            >
              {agents.length === 0 ? (
                <option value="">No agents deployed</option>
              ) : (
                agents.map(a => (
                  <option key={a._id} value={a._id}>{a.name} ({a.status})</option>
                ))
              )}
            </select>
          </div>

          <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow space-y-4">
            <h3 className="text-sm font-bold text-white mb-2">Attack Penetration Scenarios</h3>
            
            {/* Scenario 1 */}
            <div
              onClick={() => !runningScenario && runAttackScenario("drain")}
              className="p-4 bg-[#050816]/70 hover:bg-[#050816] border border-[#1f2937]/80 rounded-xl cursor-pointer hover:border-red-500/40 transition group"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-white group-hover:text-red-400 transition">💰 Wallet Drain Attempt</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-950/20 text-red-400 border border-red-500/25">Critical</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Tries to withdraw 50 ETH in a single request. Simulates private key hijack; triggers validation block and auto-kill.
              </p>
            </div>

            {/* Scenario 2 */}
            <div
              onClick={() => !runningScenario && runAttackScenario("malicious")}
              className="p-4 bg-[#050816]/70 hover:bg-[#050816] border border-[#1f2937]/80 rounded-xl cursor-pointer hover:border-red-500/40 transition group"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-white group-hover:text-red-400 transition">🛑 Blacklisted Smart Contract</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-950/20 text-red-400 border border-red-500/25">High</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Proposes delegating interaction payload to a contract explicitly blacklisted by the policy ruleset.
              </p>
            </div>

            {/* Scenario 3 */}
            <div
              onClick={() => !runningScenario && runAttackScenario("compromised")}
              className="p-4 bg-[#050816]/70 hover:bg-[#050816] border border-[#1f2937]/80 rounded-xl cursor-pointer hover:border-orange-500/40 transition group"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-white group-hover:text-orange-400 transition">🤖 Limit Threshold Breach</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-orange-950/25 text-orange-400 border border-orange-500/25">Medium</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Sends transaction size exceeding single caps to trigger limit validation FAIL.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side (Columns 3-5): Validation Timeline Trace */}
        <div className="lg:col-span-3">
          <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow min-h-[500px] flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-6">Validation Timeline Trace</h3>
              
              {runningScenario ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin mb-4" />
                  <p className="text-xs text-gray-400 font-mono">Running transaction through governance proxy...</p>
                </div>
              ) : !lastResult ? (
                <div className="py-20 text-center text-gray-500 text-xs">
                  <span>🛡️</span> Select a scenario target and launch an attack simulation.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Validation metrics header */}
                  <div className="flex justify-between items-center p-4 bg-[#050816] rounded-xl border border-[#1f2937]/85">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Decision Result</span>
                      <span className={`text-md font-bold ${
                        lastResult.decision === "Approved" ? "text-[#10B981]" : "text-[#EF4444]"
                      }`}>
                        {lastResult.decision}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Engine Risk Score</span>
                      <span className={`text-lg font-bold font-mono ${getRiskScoreColor(lastResult.riskScore)}`}>
                        {lastResult.riskScore}/100
                      </span>
                    </div>
                  </div>

                  {/* Step checks timeline */}
                  <div className="relative border-l border-[#1f2937]/80 ml-2 space-y-4">
                    {lastResult.ruleResults.map((r, i) => (
                      <div key={i} className="relative pl-6">
                        <span className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border border-[#101827] ${
                          r.status === "FAIL" ? "bg-[#EF4444]" : r.status === "WARNING" ? "bg-[#F59E0B]" : "bg-[#10B981]"
                        }`} />
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{r.ruleName}</span>
                          <span className={`text-[9px] font-bold uppercase ${
                            r.status === "FAIL" ? "text-[#EF4444]" : r.status === "WARNING" ? "text-[#F59E0B]" : "text-[#10B981]"
                          }`}>
                            ({r.status})
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 block mt-0.5 leading-relaxed">{r.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {lastResult && !runningScenario && (
              <div className="p-4 border-t border-[#1f2937]/50 mt-6 text-xs text-gray-500 leading-relaxed font-mono">
                {lastResult.killSwitchTriggered && (
                  <span className="text-[#EF4444] font-bold block mb-1">
                    ⚠ SECURITY HALT TRIGGERED: {lastResult.killSwitchReason}
                  </span>
                )}
                Result trace ID: {Math.random().toString(36).substring(8)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Manual Kill Switch */}
      {killModalOpen && (
        <div className="fixed inset-0 bg-[#050816]/75 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-md bg-[#101827] border border-[#1f2937] rounded-2xl p-6 shadow-glow relative">
            <button onClick={() => setKillModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition">✕</button>
            <h3 className="text-lg font-bold text-white mb-4">Activate Emergency Halt</h3>
            <form onSubmit={handleManualActivate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Emergency Trigger Reason</label>
                <input
                  type="text"
                  value={killReason}
                  onChange={(e) => setKillReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm font-sans"
                  placeholder="Suspected API leakage, or compromised bot behaviors..."
                />
              </div>
              <button
                type="submit"
                disabled={!killReason}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition text-sm shadow-glow-danger disabled:opacity-50"
              >
                CONFIRM DEPLOY HALT
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Deactivate Kill Switch */}
      {deactivateModalOpen && (
        <div className="fixed inset-0 bg-[#050816]/75 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-md bg-[#101827] border border-[#1f2937] rounded-2xl p-6 shadow-glow relative">
            <button onClick={() => setDeactivateModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition">✕</button>
            <h3 className="text-lg font-bold text-white mb-4">Lift Emergency Halt</h3>
            <form onSubmit={handleManualDeactivate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Audit Reason</label>
                <input
                  type="text"
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm font-sans"
                  placeholder="API credential rolled, or anomaly audit resolved..."
                />
              </div>
              <button
                type="submit"
                disabled={!deactivateReason}
                className="w-full py-2.5 bg-[#10B981] hover:bg-emerald-600 text-white font-bold rounded-xl transition text-sm shadow-glow disabled:opacity-50"
              >
                RESTORE PLATFORM ACTIVE
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

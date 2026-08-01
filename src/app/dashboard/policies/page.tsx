"use client";

import React, { useState, useEffect } from "react";
import { useNotificationStore } from "@/store/useNotificationStore";

interface DbPolicy {
  _id: string;
  name: string;
  description: string;
  status: "active" | "disabled";
  maxSingleTx: number;
  maxDailySpent: number;
  allowedWallets: string[];
  blockedWallets: string[];
  allowedNetworks: number[];
  businessHoursOnly: boolean;
  maxRiskScore: number;
  requireManualApproval: boolean;
  emergencyFreezeEnabled: boolean;
}

interface DbAgent {
  _id: string;
  name: string;
  policyId?: string;
}

export default function PoliciesPage() {
  const { addNotification } = useNotificationStore();

  const [policies, setPolicies] = useState<DbPolicy[]>([]);
  const [agents, setAgents] = useState<DbAgent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal form states
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxSingleTx, setMaxSingleTx] = useState(1.0);
  const [maxDailySpent, setMaxDailySpent] = useState(5.0);
  const [allowedWalletsInput, setAllowedWalletsInput] = useState("");
  const [blockedWalletsInput, setBlockedWalletsInput] = useState("");
  const [allowedNetworks, setAllowedNetworks] = useState<number[]>([11155111]);
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false);
  const [maxRiskScore, setMaxRiskScore] = useState(80);
  const [requireManualApproval, setRequireManualApproval] = useState(false);
  
  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/policies");
      const data = await res.json();
      if (data.success) setPolicies(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      if (data.success) setAgents(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([fetchPolicies(), fetchAgents()]).then(() => setLoading(false));
  }, []);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsSubmitting(true);

    if (!name || name.length < 3) {
      setValidationError("Policy name must be at least 3 characters");
      setIsSubmitting(false);
      return;
    }

    try {
      const allowedWallets = allowedWalletsInput.split(",").map(w => w.trim()).filter(Boolean);
      const blockedWallets = blockedWalletsInput.split(",").map(w => w.trim()).filter(Boolean);

      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          maxSingleTx,
          maxDailySpent,
          allowedWallets,
          blockedWallets,
          allowedNetworks,
          businessHoursOnly,
          maxRiskScore,
          requireManualApproval,
        })
      });
      const data = await res.json();

      setIsSubmitting(false);

      if (data.success) {
        addNotification("Policy Created", `Governance policy "${name}" created.`, "success");
        fetchPolicies();
        setModalOpen(false);
        // Reset
        setName("");
        setDescription("");
      } else {
        setValidationError(data.error?.message || "Failed to create policy");
      }
    } catch (e) {
      setValidationError("Failed to reach API server.");
      setIsSubmitting(false);
    }
  };

  const handleAssignPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicyId || !selectedAgentId) return;

    try {
      const res = await fetch(`/api/policies/${selectedPolicyId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgentId })
      });
      const data = await res.json();
      if (data.success) {
        addNotification("Policy Assigned", "Successfully assigned policy rules to AI Agent.", "success");
        fetchAgents();
        setAssignModalOpen(false);
      } else {
        alert(data.error?.message || "Assignment failed");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    const confirm = window.confirm("Are you sure you want to delete this policy?");
    if (!confirm) return;

    try {
      const res = await fetch(`/api/policies/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        addNotification("Policy Deleted", "Governance policy removed.", "info");
        fetchPolicies();
      } else {
        alert(data.error?.message || "Failed to delete policy");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getActiveAssignmentsCount = (policyId: string) => {
    return agents.filter(a => a.policyId === policyId).length;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Upper Action headers */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Governance Policies Manager</h2>
          <p className="text-gray-400 text-xs mt-0.5">Configure deterministic rules for transaction caps, timeframes, and whitelist validations.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setAssignModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold bg-[#101827] border border-[#1f2937] text-gray-400 hover:text-white rounded-xl transition"
          >
            👤 Assign Policy to Agent
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl transition shadow-glow"
          >
            + Create Ruleset Policy
          </button>
        </div>
      </div>

      {/* Policies grid list */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
        </div>
      ) : policies.length === 0 ? (
        <div className="text-center py-16 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
          <span className="text-4xl block mb-2">📜</span>
          <h4 className="text-white font-semibold">No Policies defined</h4>
          <p className="text-gray-400 text-xs mt-1 max-w-sm mx-auto">
            You must define and configure a governance policy before your autonomous agents can start transacting safely.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {policies.map((p) => (
            <div key={p._id} className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-md font-bold text-white">{p.name}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2563EB]/15 text-[#2563EB] font-bold uppercase">
                    {getActiveAssignmentsCount(p._id)} Agents Governed
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">{p.description}</p>
                
                <div className="space-y-2 border-t border-[#1f2937]/50 pt-4 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Max Single Tx Limit:</span>
                    <span className="font-semibold text-white font-mono">{p.maxSingleTx > 0 ? `${p.maxSingleTx} ETH` : "Unlimited"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Daily Spent Limit:</span>
                    <span className="font-semibold text-white font-mono">{p.maxDailySpent > 0 ? `${p.maxDailySpent} ETH` : "Unlimited"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Allowed Risk Score:</span>
                    <span className="font-semibold text-white font-mono">{p.maxRiskScore}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Whitelist Wallets:</span>
                    <span className="font-semibold text-white font-mono">{p.allowedWallets.length} addresses</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Business Hours Guard:</span>
                    <span className="font-semibold text-white font-mono">{p.businessHoursOnly ? "Active" : "Disabled"}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#1f2937]/50 pt-4 mt-6">
                <button
                  onClick={() => handleDeletePolicy(p._id)}
                  className="px-3.5 py-1.5 bg-red-950/20 border border-red-500/35 hover:bg-red-950/40 text-red-400 rounded-lg text-xs font-semibold transition"
                >
                  Delete Policy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Ruleset Policy */}
      {modalOpen && (
        <div className="fixed inset-0 bg-[#050816]/75 backdrop-blur-sm flex items-center justify-center z-50 p-6 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#101827] border border-[#1f2937] rounded-2xl p-6 shadow-glow relative my-8">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition font-bold"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-white mb-4">Build Governance Policy</h3>

            {validationError && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 text-red-400 text-xs rounded-xl">
                ⚠️ {validationError}
              </div>
            )}

            <form onSubmit={handleCreatePolicy} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Policy Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                    placeholder="Strict Treasury Bounds"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Short Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                    placeholder="Limits payments for developer SaaS tools"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Max Single Tx (ETH)</label>
                  <input
                    type="number"
                    step={0.1}
                    value={maxSingleTx}
                    onChange={(e) => setMaxSingleTx(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Max Daily Cap (ETH)</label>
                  <input
                    type="number"
                    step={0.1}
                    value={maxDailySpent}
                    onChange={(e) => setMaxDailySpent(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Whitelisted Recipients (Comma separated EVM addresses)</label>
                <textarea
                  value={allowedWalletsInput}
                  onChange={(e) => setAllowedWalletsInput(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-xs font-mono"
                  placeholder="0x71c..., 0x3fc..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Max Risk Cap Score (0-100)</label>
                  <input
                    type="number"
                    value={maxRiskScore}
                    onChange={(e) => setMaxRiskScore(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                  />
                </div>

                <div className="flex flex-col justify-center">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Time Controls</span>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="businessHoursOnly"
                      checked={businessHoursOnly}
                      onChange={(e) => setBusinessHoursOnly(e.target.checked)}
                      className="w-4 h-4 bg-[#050816] rounded border-[#1f2937] text-[#2563EB]"
                    />
                    <label htmlFor="businessHoursOnly" className="ml-2 text-xs text-gray-400">
                      Enable Business Hours Lock (9:00 - 17:00 UTC)
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#1f2937] text-gray-400 font-medium hover:text-white transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-medium transition shadow-glow flex items-center justify-center text-sm"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Build Policy"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Policy to Agent */}
      {assignModalOpen && (
        <div className="fixed inset-0 bg-[#050816]/75 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-md bg-[#101827] border border-[#1f2937] rounded-2xl p-6 shadow-glow relative">
            <button
              onClick={() => setAssignModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition font-bold"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-white mb-5">Assign Policy rules</h3>

            <form onSubmit={handleAssignPolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Agent</label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                >
                  <option value="">Choose simulated Agent</option>
                  {agents.map(a => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Policy</label>
                <select
                  value={selectedPolicyId}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                >
                  <option value="">Choose Policy ruleset</option>
                  {policies.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#1f2937] text-gray-400 font-medium hover:text-white transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedPolicyId || !selectedAgentId}
                  className="w-1/2 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-medium transition shadow-glow flex items-center justify-center text-sm disabled:opacity-50"
                >
                  Assign Governance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

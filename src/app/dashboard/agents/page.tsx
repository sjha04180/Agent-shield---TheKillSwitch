"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useWalletStore } from "@/store/useWalletStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { z } from "zod";

interface DbAgent {
  _id: string;
  name: string;
  description: string;
  purpose: string;
  network: string;
  spendingLimit: number;
  status: 'draft' | 'active' | 'paused' | 'frozen' | 'blocked' | 'archived';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  allowedTokens: string[];
  avatar: string;
  tags: string[];
  walletId: {
    _id: string;
    name: string;
    address: string;
  };
  createdAt: string;
}

const createAgentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional().default(""),
  purpose: z.string().min(3, "Purpose description is required"),
  walletId: z.string().min(1, "Governed wallet is required"),
  network: z.string().min(1, "Target network is required"),
  spendingLimit: z.number().nonnegative("Limit must be positive"),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
});

export default function AgentsDashboard() {
  const { wallets, fetchDbWallets } = useWalletStore();
  const { addNotification } = useNotificationStore();
  const { demoMode, fetchSettings } = useSettingsStore();

  const [agents, setAgents] = useState<DbAgent[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tickActive, setTickActive] = useState(true);
  
  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  // Modal form states
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [walletId, setWalletId] = useState("");
  const [network, setNetwork] = useState("Sepolia");
  const [spendingLimit, setSpendingLimit] = useState(0.5);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high' | 'critical'>("low");
  const [allowedTokens, setAllowedTokens] = useState<string[]>(["ETH"]);
  const [tagsInput, setTagsInput] = useState("");
  
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      if (data.success) {
        setAgents(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/simulator/metrics");
      const data = await res.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Initial fetches & Web3 configs mounting
  useEffect(() => {
    fetchDbWallets();
    fetchSettings();
    Promise.all([fetchAgents(), fetchMetrics()]).then(() => setLoading(false));
  }, [fetchDbWallets, fetchSettings]);

  // 2. Client Side Triggered Simulator Tick loop (Every 8 seconds)
  useEffect(() => {
    if (!tickActive || !demoMode) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/simulator/tick", { method: "POST" });
        const data = await res.json();
        
        if (data.success && data.triggersCount > 0) {
          // If transaction was generated, notify client & refetch dashboard
          data.tickResults.forEach((t: any) => {
            const emoji = t.status === "blocked" ? "🛑" : "✅";
            addNotification(
              `${emoji} Transaction Proposed`,
              `${t.agentName} spent ${t.amount} ${t.token} at ${t.vendor}. Status: ${t.status}`,
              t.status === "blocked" ? "warning" : "success"
            );
          });
          fetchAgents();
          fetchMetrics();
        }
      } catch (e) {
        console.error("Simulation tick failed:", e);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [tickActive, demoMode, addNotification]);

  // Handle agent status actions
  const triggerAgentAction = async (id: string, action: 'start' | 'pause' | 'freeze' | 'terminate') => {
    try {
      const res = await fetch(`/api/agents/${id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        addNotification(
          "Agent State Shifted",
          `Status modified to: ${data.data.status}`,
          action === "freeze" || action === "terminate" ? "error" : "info"
        );
        fetchAgents();
        fetchMetrics();
      }
    } catch (e) {
      console.error(e);
    }
  };
  
  const triggerPropose = async (agentId: string, agentName: string) => {
    addNotification("Agent Triggered", `${agentName} is analyzing transaction data and drafting proposal...`, "info");
    try {
      const res = await fetch("/api/simulator/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "safe_payment", agentId })
      });
      const data = await res.json();
      if (data.success) {
        const emoji = data.data.decision === "Blocked" ? "🛑" : "✅";
        addNotification(
          `${emoji} Proposal Evaluated`,
          `${agentName}'s proposed transaction was ${data.data.decision}. Reason: ${data.data.reason}`,
          data.data.decision === "Blocked" ? "warning" : "success"
        );
        fetchAgents();
        fetchMetrics();
      } else {
        addNotification("Evaluation Failed", data.error?.message || "Failed to trigger proposal", "error");
      }
    } catch (e) {
      console.error(e);
      addNotification("Connection Error", "Failed to connect to gateway", "error");
    }
  };

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsSubmitting(true);

    const parsed = createAgentSchema.safeParse({
      name,
      description,
      purpose,
      walletId,
      network,
      spendingLimit,
      riskLevel
    });

    if (!parsed.success) {
      setValidationError(parsed.error.errors[0]?.message || "Invalid input parameters");
      setIsSubmitting(false);
      return;
    }

    try {
      const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          purpose,
          walletId,
          network,
          spendingLimit,
          riskLevel,
          allowedTokens,
          tags
        })
      });
      const data = await res.json();

      setIsSubmitting(false);

      if (data.success) {
        setNewKey(data.rawApiKey);
        addNotification("Agent Created", `Simulated Agent ${name} registered. Ready to start.`, "success");
        fetchAgents();
        fetchMetrics();
        
        // Clear forms except key copy dialog
        setName("");
        setDescription("");
        setPurpose("");
        setTagsInput("");
      } else {
        setValidationError(data.error?.message || "Failed to create agent");
      }
    } catch (e) {
      setValidationError("Failed to connect to API");
      setIsSubmitting(false);
    }
  };

  // Filtered Agent lists calculation
  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.purpose.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" ? true : a.status === statusFilter;
      const matchesRisk = riskFilter === "all" ? true : a.riskLevel === riskFilter;
      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [agents, search, statusFilter, riskFilter]);

  const dashboardStats = useMemo(() => {
    const total = agents.length;
    const running = agents.filter(a => a.status === 'active').length;
    const paused = agents.filter(a => a.status === 'paused').length;
    const blocked = agents.filter(a => a.status === 'blocked').length;
    const criticalRisk = agents.filter(a => a.riskLevel === 'critical').length;
    return { total, running, paused, blocked, criticalRisk };
  }, [agents]);

  // Dynamic risk color helper
  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "bg-[#10B981]/15 text-[#10B981]";
      case "medium": return "bg-[#F59E0B]/15 text-[#F59E0B]";
      case "high": return "bg-orange-500/15 text-orange-400";
      case "critical": return "bg-[#EF4444]/15 text-[#EF4444] animate-pulse";
      default: return "bg-gray-800 text-gray-400";
    }
  };

  // Dynamic status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25";
      case "paused": return "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/25";
      case "frozen": return "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/25";
      case "blocked": return "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/25";
      default: return "bg-gray-800/50 text-gray-400 border border-gray-700/50";
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Upper Action headers */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Autonomous AI Agents Console</h2>
          <p className="text-gray-400 text-xs mt-0.5">Deploy, manage policies, and monitor financial simulation pipelines.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Simulator Toggle Button */}
          <button
            onClick={() => setTickActive(!tickActive)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition ${
              tickActive
                ? "bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
            }`}
          >
            {tickActive ? "● Simulator Loop Running" : "○ Simulator Suspended"}
          </button>
          <button
            onClick={() => {
              setValidationError(null);
              setNewKey(null);
              setModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl transition shadow-glow"
          >
            + Deploy Simulated Agent
          </button>
        </div>
      </div>

      {/* Metrics Dashboard Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-[#101827] border border-[#1f2937]/80 rounded-2xl text-center">
          <span className="text-xs text-gray-500 block mb-1">Total Agents</span>
          <span className="text-2xl font-bold text-white">{dashboardStats.total}</span>
        </div>
        <div className="p-4 bg-[#101827] border border-[#1f2937]/80 rounded-2xl text-center">
          <span className="text-xs text-gray-500 block mb-1">Running</span>
          <span className="text-2xl font-bold text-[#10B981]">{dashboardStats.running}</span>
        </div>
        <div className="p-4 bg-[#101827] border border-[#1f2937]/80 rounded-2xl text-center">
          <span className="text-xs text-gray-500 block mb-1">Paused</span>
          <span className="text-2xl font-bold text-[#F59E0B]">{dashboardStats.paused}</span>
        </div>
        <div className="p-4 bg-[#101827] border border-[#1f2937]/80 rounded-2xl text-center">
          <span className="text-xs text-gray-500 block mb-1">Suspended / Blocked</span>
          <span className="text-2xl font-bold text-[#EF4444]">{dashboardStats.blocked}</span>
        </div>
        <div className="p-4 bg-[#101827] border border-[#1f2937]/80 rounded-2xl text-center">
          <span className="text-xs text-gray-500 block mb-1">Critical Risk</span>
          <span className="text-2xl font-bold text-[#EF4444]">{dashboardStats.criticalRisk}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[#101827] border border-[#1f2937]/80 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm font-sans"
            placeholder="Search agents or purpose..."
          />
          <span className="absolute left-3.5 top-2.5 text-xs text-gray-500">🔍</span>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          {/* Status filter select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-40 px-3 py-2 rounded-xl bg-[#050816] border border-[#1f2937] text-white text-xs focus:outline-none focus:border-[#2563EB]"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="frozen">Frozen</option>
            <option value="blocked">Suspended</option>
          </select>

          {/* Risk filter select */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-full md:w-40 px-3 py-2 rounded-xl bg-[#050816] border border-[#1f2937] text-white text-xs focus:outline-none focus:border-[#2563EB]"
          >
            <option value="all">All Risks</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
            <option value="critical">Critical Risk</option>
          </select>
        </div>
      </div>

      {/* Agents grid layout */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-16 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
          <span className="text-4xl block mb-2">🤖</span>
          <h4 className="text-white font-semibold">No Agents found</h4>
          <p className="text-gray-400 text-xs mt-1 max-w-sm mx-auto">
            Try adjusting your search tags or deploy a new agent model.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <div key={agent._id} className="bg-[#101827] border border-[#1f2937]/80 rounded-2xl overflow-hidden shadow-glow flex flex-col justify-between">
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center text-xl font-bold text-[#2563EB]">
                      🤖
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm hover:underline">
                        <Link href={`/dashboard/agents/${agent._id}`}>{agent.name}</Link>
                      </h4>
                      <span className="text-[10px] text-gray-500 font-mono">ID: {agent._id.slice(0, 8)}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${getStatusColor(agent.status)}`}>
                    {agent.status === "blocked" ? "Suspended" : agent.status}
                  </span>
                </div>

                {/* Info block */}
                <p className="text-xs text-gray-400 leading-relaxed min-h-[48px] mb-4">{agent.purpose}</p>

                <div className="space-y-2 border-t border-[#1f2937]/50 pt-4 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Spending Cap:</span>
                    <span className="font-semibold text-white font-mono">{agent.spendingLimit} {agent.allowedTokens.join("/")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Risk Profile:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${getRiskColor(agent.riskLevel)}`}>
                      {agent.riskLevel}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wallet Link:</span>
                    <span className="font-semibold text-white truncate max-w-[150px] font-mono">{agent.walletId?.name || "Unassigned"}</span>
                  </div>
                </div>
              </div>

              {/* Action bar footer */}
              <div className="px-6 py-4 bg-[#050816]/50 border-t border-[#1f2937]/60 flex justify-between gap-2">
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/agents/${agent._id}`}
                    className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Configure
                  </Link>
                  {agent.status === "active" && (
                    <button
                      onClick={() => triggerPropose(agent._id, agent.name)}
                      className="px-3 py-1.5 bg-[#2563EB]/20 hover:bg-[#2563EB]/35 text-[#3b82f6] rounded-lg text-xs font-bold transition flex items-center gap-1"
                      title="Trigger Agent to Propose a Transaction"
                    >
                      ⚡ Propose
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  {agent.status === "active" ? (
                    <button
                      onClick={() => triggerAgentAction(agent._id, "pause")}
                      className="px-2.5 py-1 text-xs bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#F59E0B] rounded-lg transition"
                    >
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={() => triggerAgentAction(agent._id, "start")}
                      className="px-2.5 py-1 text-xs bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] rounded-lg transition"
                      disabled={agent.status === "blocked"}
                    >
                      Start
                    </button>
                  )}
                  
                  {agent.status !== "blocked" && (
                    <button
                      onClick={() => triggerAgentAction(agent._id, "terminate")}
                      className="px-2.5 py-1 text-xs bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] rounded-lg transition"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Deploy Agent Setup */}
      {modalOpen && (
        <div className="fixed inset-0 bg-[#050816]/75 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-lg bg-[#101827] border border-[#1f2937] rounded-2xl p-6 shadow-glow relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition font-bold"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-white mb-4">Deploy Governed AI Agent</h3>

            {validationError && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 text-red-400 text-xs rounded-xl">
                ⚠️ {validationError}
              </div>
            )}

            {newKey ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-950/30 border border-emerald-500/35 text-emerald-400 text-xs rounded-xl">
                  🔑 **AGENT CREDENTIALS GENERATED**: Copy and save this Secret API Key. It will NOT be shown again.
                </div>
                <div className="p-3 bg-[#050816] rounded-xl border border-[#1f2937] font-mono text-xs text-white break-all flex items-center justify-between">
                  <span>{newKey}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(newKey)}
                    className="ml-2 text-gray-400 hover:text-white underline font-sans text-[11px]"
                  >
                    Copy
                  </button>
                </div>
                <button
                  onClick={() => {
                    setNewKey(null);
                    setModalOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-semibold transition"
                >
                  Completed Setup
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterAgent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Agent Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                      placeholder="Cloud Cost Optimizer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Governing Wallet</label>
                    <select
                      value={walletId}
                      onChange={(e) => setWalletId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                    >
                      <option value="">Select Target Wallet</option>
                      {wallets.map(w => (
                        <option key={w._id} value={w._id}>{w.name} ({w.address.slice(0, 6)}...)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Description & Purpose</label>
                  <textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm font-sans"
                    placeholder="This agent monitors server loads on GCP and dynamically allocates GPU and server node expansions."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Target Network</label>
                    <select
                      value={network}
                      onChange={(e) => setNetwork(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                    >
                      <option value="Sepolia">Sepolia Testnet</option>
                      <option value="Ethereum">Ethereum Mainnet</option>
                      <option value="Polygon">Polygon Mainnet</option>
                      <option value="Base">Base Mainnet</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Default Spending Limit</label>
                    <input
                      type="number"
                      step={0.1}
                      value={spendingLimit}
                      onChange={(e) => setSpendingLimit(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Initial Risk Level</label>
                    <select
                      value={riskLevel}
                      onChange={(e) => setRiskLevel(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                    >
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk</option>
                      <option value="critical">Critical Risk</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Tags (Comma separated)</label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                      placeholder="infra, cost-optimization, bot"
                    />
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
                      "Deploy Agent"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

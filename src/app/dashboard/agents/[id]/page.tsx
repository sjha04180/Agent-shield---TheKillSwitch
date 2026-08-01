"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { useNotificationStore } from "@/store/useNotificationStore";
import Link from "next/link";

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
}

interface AgentTx {
  _id: string;
  transactionId: string;
  recipient: string;
  token: string;
  network: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'blocked' | 'rejected' | 'executed';
  timestamp: string;
}

interface AgentActivityLog {
  _id: string;
  activityType: string;
  details: string;
  timestamp: string;
}

interface AgentMetricsStats {
  requestsToday: number;
  approvedCount: number;
  rejectedCount: number;
  blockedCount: number;
  successRate: number;
  averageRequestAmount: number;
}

export default function AgentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { addNotification } = useNotificationStore();

  const [agent, setAgent] = useState<DbAgent | null>(null);
  const [transactions, setTransactions] = useState<AgentTx[]>([]);
  const [activities, setActivities] = useState<AgentActivityLog[]>([]);
  const [metrics, setMetrics] = useState<AgentMetricsStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [limitInput, setLimitInput] = useState(0.5);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high' | 'critical'>("low");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchAllData = async () => {
    try {
      const [agentRes, txRes, actRes, metRes] = await Promise.all([
        fetch(`/api/agents/${id}`),
        fetch(`/api/agents/${id}/transactions`),
        fetch(`/api/agents/${id}/activity`),
        fetch(`/api/agents/${id}/metrics`)
      ]);

      const [agentData, txData, actData, metData] = await Promise.all([
        agentRes.json(),
        txRes.json(),
        actRes.json(),
        metRes.json()
      ]);

      if (agentData.success) {
        setAgent(agentData.data);
        setLimitInput(agentData.data.spendingLimit);
        setRiskLevel(agentData.data.riskLevel);
      }
      if (txData.success) setTransactions(txData.data);
      if (actData.success) setActivities(actData.data);
      if (metData.success) setMetrics(metData.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAllData().then(() => setLoading(false));
  }, [id]);

  // Periodic polling: every 5 seconds, sync transactions and metrics to display simulation
  useEffect(() => {
    if (loading || !agent || agent.status !== "active") return;

    const interval = setInterval(() => {
      fetchAllData();
    }, 5000);

    return () => clearInterval(interval);
  }, [loading, agent]);

  // Actions
  const handleAction = async (action: 'start' | 'pause' | 'freeze' | 'terminate') => {
    try {
      const res = await fetch(`/api/agents/${id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        addNotification(
          "State Updated",
          `Agent state changed to: ${data.data.status}`,
          action === "freeze" || action === "terminate" ? "error" : "info"
        );
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePolicies = async () => {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spendingLimit: limitInput, riskLevel })
      });
      const data = await res.json();
      if (data.success) {
        addNotification("Policy Updated", "Agent spending limit parameters modified.", "success");
        setIsEditing(false);
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteAgent = async () => {
    const confirm = window.confirm("WARNING: Are you sure you want to permanently delete this AI Agent and all its transaction history?");
    if (!confirm) return;

    try {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        addNotification("Agent Removed", "Successfully deleted simulated agent records.", "info");
        router.push("/dashboard/agents");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <h3 className="text-white font-bold text-lg">Agent Not Found</h3>
        <Link href="/dashboard/agents" className="text-[#2563EB] hover:underline text-sm mt-2 block">
          Back to Agents Console
        </Link>
      </div>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "bg-[#10B981]/15 text-[#10B981]";
      case "medium": return "bg-[#F59E0B]/15 text-[#F59E0B]";
      case "high": return "bg-orange-500/15 text-orange-400";
      case "critical": return "bg-[#EF4444]/15 text-[#EF4444]";
      default: return "bg-gray-800 text-gray-400";
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/dashboard/agents" className="hover:text-white transition">Agents Console</Link>
        <span>/</span>
        <span className="text-gray-300">{agent.name}</span>
      </div>

      {/* Profile Header Detail Panel */}
      <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-3xl">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">{agent.name}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-gray-800 text-gray-400">
                  {agent.network}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                  agent.status === "active" ? "bg-[#10B981]/15 text-[#10B981]" : "bg-[#EF4444]/15 text-[#EF4444]"
                }`}>
                  {agent.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-xl">{agent.purpose}</p>
            </div>
          </div>

          {/* Quick Action controls */}
          <div className="flex flex-wrap gap-2.5">
            {agent.status === "active" ? (
              <button
                onClick={() => handleAction("pause")}
                className="px-4 py-2 text-xs font-semibold bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#F59E0B] rounded-xl transition"
              >
                ⏸ Pause Agent
              </button>
            ) : (
              <button
                onClick={() => handleAction("start")}
                className="px-4 py-2 text-xs font-semibold bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] rounded-xl transition"
                disabled={agent.status === "blocked"}
              >
                ▶ Start Agent
              </button>
            )}
            
            {agent.status !== "frozen" && (
              <button
                onClick={() => handleAction("freeze")}
                className="px-4 py-2 text-xs font-semibold bg-red-950/20 border border-red-500/35 hover:bg-red-950/40 text-red-400 rounded-xl transition"
              >
                ❄ Freeze Agent
              </button>
            )}
            
            {agent.status !== "blocked" && (
              <button
                onClick={() => handleAction("terminate")}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition"
              >
                🚨 Terminate Agent
              </button>
            )}
            
            <button
              onClick={handleDeleteAgent}
              className="p-2 text-gray-500 hover:text-red-400 transition"
              title="Delete Agent"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
          <span className="text-xs text-gray-500 block mb-1">Today's Proposals</span>
          <span className="text-2xl font-bold text-white">{metrics?.requestsToday || 0}</span>
        </div>
        <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
          <span className="text-xs text-gray-500 block mb-1">Success Rate</span>
          <span className="text-2xl font-bold text-[#10B981]">{metrics?.successRate || 100}%</span>
        </div>
        <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
          <span className="text-xs text-gray-500 block mb-1">Average Request Size</span>
          <span className="text-2xl font-bold text-white font-mono">{metrics?.averageRequestAmount || 0} {agent.allowedTokens[0]}</span>
        </div>
        <div className="p-5 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
          <span className="text-xs text-gray-500 block mb-1">Blocked / Anomalous</span>
          <span className="text-2xl font-bold text-[#EF4444]">{metrics?.blockedCount || 0}</span>
        </div>
      </div>

      {/* Split Details & Timeline grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Policies & Transaction Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Policy Settings card */}
          <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white">Limits & Spending Polices</h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs text-[#2563EB] hover:underline"
              >
                {isEditing ? "Cancel" : "Update Limit Rules"}
              </button>
            </div>
            
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-semibold">Spending Cap</label>
                    <input
                      type="number"
                      step={0.1}
                      value={limitInput}
                      onChange={(e) => setLimitInput(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1f2937] text-white text-xs focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-semibold">Risk Level</label>
                    <select
                      value={riskLevel}
                      onChange={(e) => setRiskLevel(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-xs"
                    >
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk</option>
                      <option value="critical">Critical Risk</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleUpdatePolicies}
                    disabled={savingEdit}
                    className="px-4 py-2 bg-[#2563EB] text-white font-semibold text-xs rounded-xl hover:bg-blue-700 transition"
                  >
                    {savingEdit ? "Saving..." : "Save Policies"}
                  </button>
                </div>
              </div>
            ) : (
              <ul className="space-y-3.5 text-xs text-gray-400">
                <li className="flex justify-between border-b border-[#1f2937]/50 pb-2.5">
                  <span>Default Spending Cap</span>
                  <span className="font-semibold text-white font-mono">{agent.spendingLimit} {agent.allowedTokens.join("/")}</span>
                </li>
                <li className="flex justify-between border-b border-[#1f2937]/50 pb-2.5">
                  <span>Assigned Risk Level</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${getRiskColor(agent.riskLevel)}`}>
                    {agent.riskLevel}
                  </span>
                </li>
                <li className="flex justify-between pb-2.5">
                  <span>Governed Wallet Module</span>
                  <span className="font-semibold text-white font-mono">{agent.walletId?.address || "Unassigned"}</span>
                </li>
              </ul>
            )}
          </div>

          {/* Transactions List */}
          <div className="bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1f2937]/80">
              <h3 className="text-sm font-bold text-white">Agent Transaction proposals</h3>
            </div>
            
            {transactions.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-12">No simulated transactions generated yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1f2937]/85 text-xs text-gray-500 uppercase font-semibold">
                      <th className="px-6 py-3">Vendor / Purpose</th>
                      <th className="px-6 py-3">Recipient</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2937]/50">
                    {transactions.map((tx) => (
                      <tr key={tx._id} className="hover:bg-[#050816]/30 transition">
                        <td className="px-6 py-3 font-semibold text-white">{tx.reason}</td>
                        <td className="px-6 py-3 font-mono text-gray-500">{tx.recipient.slice(0, 8)}...{tx.recipient.slice(-6)}</td>
                        <td className="px-6 py-3 font-mono text-white">{tx.amount} {tx.token}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                            tx.status === "executed" || tx.status === "approved"
                              ? "bg-[#10B981]/15 text-[#10B981]"
                              : "bg-[#EF4444]/15 text-[#EF4444]"
                          }`}>
                            {tx.status === "executed" ? "Executed" : tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Timeline Audit Trails */}
        <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
          <h3 className="text-sm font-bold text-white mb-6">Activity Timeline</h3>
          {activities.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-12">No activity events log.</p>
          ) : (
            <div className="relative border-l border-[#1f2937]/80 ml-2 space-y-6">
              {activities.map((act) => (
                <div key={act._id} className="relative pl-6">
                  {/* Timeline dot */}
                  <span className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border border-[#101827] ${
                    act.activityType === "TX_BLOCKED" || act.activityType === "FROZEN" || act.activityType === "TERMINATED"
                      ? "bg-[#EF4444]"
                      : act.activityType === "TX_APPROVED" || act.activityType === "STARTED" || act.activityType === "CREATED"
                      ? "bg-[#10B981]"
                      : "bg-[#2563EB]"
                  }`} />
                  
                  <span className="text-[10px] text-gray-500 font-mono block">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="text-xs font-semibold text-white block mt-0.5">{act.details}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

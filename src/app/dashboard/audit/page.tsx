"use client";

import React, { useState, useEffect } from "react";

interface ValidationRule {
  ruleName: string;
  status: "PASS" | "WARNING" | "FAIL";
  message: string;
}

interface ValidationRecord {
  _id: string;
  transactionId: string;
  recipient: string;
  amount: number;
  token: string;
  status: "Approved" | "Blocked" | "Pending Manual Review";
  riskScore: number;
  rulesTriggered: ValidationRule[];
  timestamp: string;
  agentId?: {
    name: string;
  };
  policyId?: {
    name: string;
  };
}

interface DbAgent {
  _id: string;
  name: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<ValidationRecord[]>([]);
  const [agents, setAgents] = useState<DbAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Detail Modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ValidationRecord | null>(null);

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      if (data.success) setAgents(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedAgentId) queryParams.set("agentId", selectedAgentId);
      if (selectedStatus && selectedStatus !== "all") queryParams.set("status", selectedStatus);
      if (searchQuery) queryParams.set("query", searchQuery);

      const res = await fetch(`/api/audit?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) setLogs(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedAgentId, selectedStatus, searchQuery]);

  const getRiskColor = (score: number) => {
    if (score < 25) return "text-[#10B981] font-bold";
    if (score < 50) return "text-[#F59E0B] font-bold";
    if (score < 75) return "text-orange-400 font-bold";
    return "text-[#EF4444] font-bold";
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <p className="text-gray-400 text-xs">Immutable validation timeline. Browse step-by-step rule results and risk factor calculations.</p>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-[#101827] border border-[#1f2937]/80 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-glow">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm font-sans"
            placeholder="Search recipient address or hash..."
          />
          <span className="absolute left-3.5 top-2.5 text-xs text-gray-500">🔍</span>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          {/* Agent filter */}
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full md:w-48 px-3 py-2 rounded-xl bg-[#050816] border border-[#1f2937] text-white text-xs focus:outline-none focus:border-[#2563EB]"
          >
            <option value="">All Simulated Agents</option>
            {agents.map(a => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full md:w-40 px-3 py-2 rounded-xl bg-[#050816] border border-[#1f2937] text-white text-xs focus:outline-none focus:border-[#2563EB]"
          >
            <option value="all">All Outcomes</option>
            <option value="Approved">Approved</option>
            <option value="Blocked">Blocked</option>
            <option value="Pending Manual Review">Manual Review</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-4xl block mb-2">📜</span>
            <p className="text-gray-400 text-sm">No validation logs match query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1f2937]/85 text-xs text-gray-500 uppercase font-semibold">
                  <th className="px-6 py-4">Agent Name</th>
                  <th className="px-6 py-4">Recipient</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Risk Score</th>
                  <th className="px-6 py-4">Decision</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]/50">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-[#050816]/30 transition">
                    <td className="px-6 py-4 font-semibold text-white">
                      {log.agentId?.name || "Deleted Agent"}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-500">
                      {log.recipient.slice(0, 12)}...{log.recipient.slice(-10)}
                    </td>
                    <td className="px-6 py-4 font-mono text-white">
                      {log.amount} {log.token}
                    </td>
                    <td className={`px-6 py-4 font-mono ${getRiskColor(log.riskScore)}`}>
                      {log.riskScore}/100
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.status === "Approved"
                          ? "bg-[#10B981]/15 text-[#10B981]"
                          : log.status === "Blocked"
                          ? "bg-[#EF4444]/15 text-[#EF4444]"
                          : "bg-[#F59E0B]/15 text-[#F59E0B]"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setDetailModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded font-semibold transition"
                      >
                        Trace
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Rule Execution Timeline Trace */}
      {detailModalOpen && selectedLog && (
        <div className="fixed inset-0 bg-[#050816]/75 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-lg bg-[#101827] border border-[#1f2937] rounded-2xl p-6 shadow-glow relative">
            <button
              onClick={() => setDetailModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition font-bold"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-white mb-4">Validation Logs Detail</h3>

            <div className="p-4 bg-[#050816] rounded-xl border border-[#1f2937] text-xs text-gray-400 space-y-2 mb-6">
              <div className="flex justify-between">
                <span>Proposed Hash:</span>
                <span className="font-mono text-white text-[11px]">{selectedLog.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span>Assigned Policy:</span>
                <span className="font-semibold text-white">{selectedLog.policyId?.name || "Unassigned Ruleset"}</span>
              </div>
              <div className="flex justify-between">
                <span>Verification Time:</span>
                <span className="font-semibold text-white">{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>
            </div>

            {/* Checklists */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {selectedLog.rulesTriggered.map((rule, idx) => (
                <div key={idx} className="flex gap-4 p-3 bg-[#050816]/40 border border-[#1f2937]/50 rounded-xl">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                    rule.status === "FAIL"
                      ? "bg-[#EF4444]"
                      : rule.status === "WARNING"
                      ? "bg-[#F59E0B]"
                      : "bg-[#10B981]"
                  }`}>
                    {rule.status === "FAIL" ? "✕" : rule.status === "WARNING" ? "!" : "✓"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{rule.ruleName}</span>
                      <span className={`text-[9px] font-bold ${
                        rule.status === "FAIL" ? "text-[#EF4444]" : rule.status === "WARNING" ? "text-[#F59E0B]" : "text-[#10B981]"
                      }`}>
                        {rule.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{rule.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

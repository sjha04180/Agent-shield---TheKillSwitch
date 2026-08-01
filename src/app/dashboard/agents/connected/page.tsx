"use client";

import React, { useEffect, useState } from "react";
import { ConnectedAgentInfo } from "@/types/agent-adapter";

export default function ConnectedAgentsPage() {
  const [agents, setAgents] = useState<ConnectedAgentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Poll for connected agents every 5 seconds
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/providers");
        const data = await res.json();
        
        // Fetch detailed stats for individual connected agents
        const res2 = await fetch("/api/agents/connected");
        const data2 = await res2.json();
        if (data2.success) {
          setAgents(data2.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-xl font-bold text-white">Connected Agents Panel</h2>
        <p className="text-gray-400 text-xs">Live monitoring of Lyzr AI and internal simulator agents.</p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {agents.map((agent) => (
            <div key={agent.agentId} className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{agent.agentName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 bg-[#050816] px-2 py-0.5 rounded">
                      {agent.provider}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">ID: {agent.agentId}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${agent.status === 'online' ? 'bg-[#10B981]' : 'bg-red-500'}`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${agent.status === 'online' ? 'bg-[#10B981]' : 'bg-red-500'}`}></span>
                  </span>
                  <span className="text-xs uppercase font-bold text-gray-400">{agent.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#1f2937]/50">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Requests Today</span>
                  <span className="text-xl font-bold text-white">{agent.requestsToday}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Approved</span>
                  <span className="text-xl font-bold text-[#10B981]">{agent.approvedCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Blocked</span>
                  <span className="text-xl font-bold text-red-500">{agent.blockedCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Avg Risk</span>
                  <span className="text-xl font-bold text-orange-400">{agent.averageRisk}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-[#1f2937]/50 flex justify-between items-center">
                 <span className="text-[10px] text-gray-500">Latency: <span className="text-emerald-400 font-mono">{agent.latencyMs}ms</span></span>
                 <span className="text-[10px] text-gray-500">Last Seen: {new Date(agent.lastSeen).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}

          {agents.length === 0 && (
            <div className="col-span-full py-12 text-center border border-dashed border-[#1f2937]/80 rounded-2xl">
              <p className="text-gray-500 text-sm">No agents are currently connected or registered.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

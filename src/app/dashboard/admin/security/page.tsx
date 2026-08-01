"use client";

import React, { useState, useEffect } from "react";

interface Violation {
  _id: string;
  recipient: string;
  amount: number;
  token: string;
  riskScore: number;
  agentId?: {
    name: string;
  };
  timestamp: string;
}

interface KillEvent {
  _id: string;
  status: string;
  reason: string;
  triggerType: string;
  timestamp: string;
}

export default function AdminSecurityPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [killSwitches, setKillSwitches] = useState<KillEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSecurityData = async () => {
    try {
      const res = await fetch("/api/admin/security");
      const data = await res.json();
      if (data.success) {
        setViolations(data.data.violations);
        setKillSwitches(data.data.killSwitches);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-xl font-bold text-white">Threat Detection Security Center</h2>
        <p className="text-gray-400 text-xs">Observe active threat matrices, policy violations, and emergency events.</p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Policy Violations logs */}
          <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
            <h3 className="text-sm font-bold text-white mb-4">Recent Blocked Violations</h3>
            {violations.length === 0 ? (
              <p className="text-xs text-gray-500">No policy violations blocked yet.</p>
            ) : (
              <div className="space-y-3">
                {violations.map((v) => (
                  <div key={v._id} className="p-3 bg-[#050816] rounded-xl border border-[#1f2937]/80 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-white font-semibold block">{v.agentId?.name || "AI Agent"}</span>
                      <span className="text-[10px] text-gray-500 font-mono">Recipient: {v.recipient.slice(0, 10)}...</span>
                    </div>
                    <span className="text-[#EF4444] font-bold font-mono">Risk: {v.riskScore}/100</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Emergency Kill Switches logs */}
          <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
            <h3 className="text-sm font-bold text-white mb-4">Kill Switch Log Events</h3>
            {killSwitches.length === 0 ? (
              <p className="text-xs text-gray-500">No emergency halt events recorded.</p>
            ) : (
              <div className="space-y-3">
                {killSwitches.map((ks) => (
                  <div key={ks._id} className="p-3 bg-[#050816] rounded-xl border border-[#1f2937]/80 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-white font-semibold block uppercase">Action: {ks.status}</span>
                      <span className="text-[10px] text-gray-500">Reason: {ks.reason}</span>
                    </div>
                    <span className="text-gray-500 font-mono text-[10px]">
                      {new Date(ks.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

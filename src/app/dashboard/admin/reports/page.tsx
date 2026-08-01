"use client";

import React, { useState, useEffect } from "react";
import { useReportStore } from "@/store/useReportStore";
import { useNotificationStore } from "@/store/useNotificationStore";

export default function AdminReportsPage() {
  const { reports, loading, fetchReports, generateReport } = useReportStore();
  const { addNotification } = useNotificationStore();

  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const [format, setFormat] = useState<"PDF" | "CSV">("CSV");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || title.length < 5) return;
    
    setIsGenerating(true);
    const success = await generateReport(title, reportType, format);
    setIsGenerating(false);

    if (success) {
      addNotification("Report Generated", `Security audit report "${title}" generated successfully.`, "success");
      setTitle("");
    }
  };

  const handleDownload = (report: any) => {
    // Generate mock CSV content and download
    const csvContent = "data:text/csv;charset=utf-8,Audit,Agent,Wallet,Action,Risk,Timestamp\n" +
      `Report,${report.title},${report.reportType},${report.format},Low,${report.generatedAt}`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${report.title.toLowerCase().replace(/\s+/g, "_")}.${report.format.toLowerCase()}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-xl font-bold text-white">System Reports Directory</h2>
        <p className="text-gray-400 text-xs">Download legal, audit-compliant compliance logs and policy summaries.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Columns 1-2): Reports Directory logs */}
        <div className="lg:col-span-2 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1f2937]/85">
            <h3 className="text-sm font-bold text-white">Available Audits</h3>
          </div>
          
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-12">No reports generated yet.</p>
          ) : (
            <div className="divide-y divide-[#1f2937]/50 text-xs">
              {reports.map((rep) => (
                <div key={rep._id} className="p-4 flex justify-between items-center hover:bg-[#050816]/30 transition text-gray-300">
                  <div>
                    <span className="font-bold text-white block">{rep.title}</span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      Type: {rep.reportType} | Format: {rep.format} ({rep.size})
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownload(rep)}
                    className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded font-semibold transition text-[10px] uppercase font-sans"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Generation Panel */}
        <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
          <h3 className="text-sm font-bold text-white mb-4">Request New Compilation</h3>
          
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Audit Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] text-xs font-sans"
                placeholder="Weekly Threat Scopes..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Compilation Window</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1f2937] text-white text-xs"
              >
                <option value="Daily">Daily Summary</option>
                <option value="Weekly">Weekly Scope</option>
                <option value="Monthly">Monthly Directory</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Format Suffix</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#1f2937] text-white text-xs"
              >
                <option value="CSV">Comma Separated values (CSV)</option>
                <option value="PDF">Portable Document format (PDF)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isGenerating || title.length < 5}
              className="w-full py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              {isGenerating ? "Compiling..." : "Generate Audit"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

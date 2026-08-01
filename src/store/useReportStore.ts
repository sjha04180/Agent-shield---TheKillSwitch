import { create } from "zustand";

export interface AuditReport {
  _id: string;
  title: string;
  reportType: "Daily" | "Weekly" | "Monthly";
  format: "PDF" | "CSV";
  path: string;
  size: string;
  generatedAt: string;
}

interface ReportState {
  reports: AuditReport[];
  loading: boolean;
  error: string | null;
  
  fetchReports: () => Promise<void>;
  generateReport: (title: string, reportType: "Daily" | "Weekly" | "Monthly", format: "PDF" | "CSV") => Promise<boolean>;
}

export const useReportStore = create<ReportState>((set, get) => ({
  reports: [],
  loading: false,
  error: null,

  fetchReports: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/admin/reports");
      const data = await res.json();
      if (data.success) {
        set({ reports: data.data, loading: false });
      } else {
        set({ error: data.error?.message || "Failed to load reports", loading: false });
      }
    } catch (e) {
      set({ error: "Failed to connect to API", loading: false });
    }
  },

  generateReport: async (title, reportType, format) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/admin/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, reportType, format })
      });
      const data = await res.json();
      if (data.success) {
        await get().fetchReports();
        return true;
      } else {
        set({ error: data.error?.message || "Failed to generate report", loading: false });
        return false;
      }
    } catch (e) {
      set({ error: "API connection error", loading: false });
      return false;
    }
  }
}));

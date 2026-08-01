import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemHealth extends Document {
  apiStatus: "healthy" | "unstable" | "down";
  dbStatus: "healthy" | "unstable" | "down";
  blockchainStatus: "healthy" | "unstable" | "down";
  geminiStatus: "healthy" | "unstable" | "down";
  // Extended subsystem statuses
  lyzrStatus: "healthy" | "unstable" | "down";
  simulatorStatus: "healthy" | "unstable" | "down";
  metaMaskStatus: "healthy" | "unstable" | "down";
  // Performance metrics
  responseTime: number;   // DB latency in ms
  memoryUsage: number;    // percentage
  storageUsage: number;   // percentage
  apiLatencyMs: number;   // API gateway latency in ms
  version: string;        // app version
  timestamp: Date;
}

const SystemHealthSchema = new Schema<ISystemHealth>({
  apiStatus: { type: String, enum: ["healthy", "unstable", "down"], default: "healthy" },
  dbStatus: { type: String, enum: ["healthy", "unstable", "down"], default: "healthy" },
  blockchainStatus: { type: String, enum: ["healthy", "unstable", "down"], default: "healthy" },
  geminiStatus: { type: String, enum: ["healthy", "unstable", "down"], default: "healthy" },
  lyzrStatus: { type: String, enum: ["healthy", "unstable", "down"], default: "healthy" },
  simulatorStatus: { type: String, enum: ["healthy", "unstable", "down"], default: "healthy" },
  metaMaskStatus: { type: String, enum: ["healthy", "unstable", "down"], default: "healthy" },
  responseTime: { type: Number, default: 20 },
  memoryUsage: { type: Number, default: 45 },
  storageUsage: { type: Number, default: 35 },
  apiLatencyMs: { type: Number, default: 0 },
  version: { type: String, default: "0.1.0" },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: { createdAt: "timestamp", updatedAt: false } });

export const SystemHealth: Model<ISystemHealth> =
  mongoose.models.SystemHealth || mongoose.model<ISystemHealth>("SystemHealth", SystemHealthSchema);

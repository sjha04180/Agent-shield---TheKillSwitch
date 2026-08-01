import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemHealth extends Document {
  apiStatus: "healthy" | "unstable" | "down";
  dbStatus: "healthy" | "unstable" | "down";
  blockchainStatus: "healthy" | "unstable" | "down";
  geminiStatus: "healthy" | "unstable" | "down";
  responseTime: number; // in ms
  memoryUsage: number; // percentage
  storageUsage: number; // percentage
  timestamp: Date;
}

const SystemHealthSchema = new Schema<ISystemHealth>({
  apiStatus: { type: String, enum: ["healthy", "unstable", "down"], default: "healthy" },
  dbStatus: { type: String, enum: ["healthy", "unstable", "down"], default: "healthy" },
  blockchainStatus: { type: String, enum: ["healthy", "unstable", "down"], default: "healthy" },
  geminiStatus: { type: String, enum: ["healthy", "unstable", "down"], default: "healthy" },
  responseTime: { type: Number, default: 20 },
  memoryUsage: { type: Number, default: 45 },
  storageUsage: { type: Number, default: 35 },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: { createdAt: "timestamp", updatedAt: false } });

export const SystemHealth: Model<ISystemHealth> =
  mongoose.models.SystemHealth || mongoose.model<ISystemHealth>("SystemHealth", SystemHealthSchema);

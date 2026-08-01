import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAgentMetrics extends Document {
  agentId: mongoose.Types.ObjectId;
  requestsToday: number;
  approvedCount: number;
  rejectedCount: number;
  blockedCount: number;
  successRate: number; // e.g. 94.5 (percentage)
  averageRequestAmount: number;
  updatedAt: Date;
}

const AgentMetricsSchema = new Schema<IAgentMetrics>({
  agentId: { type: Schema.Types.ObjectId, ref: "Agent", required: true, unique: true, index: true },
  requestsToday: { type: Number, default: 0 },
  approvedCount: { type: Number, default: 0 },
  rejectedCount: { type: Number, default: 0 },
  blockedCount: { type: Number, default: 0 },
  successRate: { type: Number, default: 100 },
  averageRequestAmount: { type: Number, default: 0 },
}, { timestamps: true });

export const AgentMetrics: Model<IAgentMetrics> =
  mongoose.models.AgentMetrics || mongoose.model<IAgentMetrics>("AgentMetrics", AgentMetricsSchema);

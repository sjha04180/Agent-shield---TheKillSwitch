import mongoose, { Schema, Document, Model } from "mongoose";
import { AgentProvider } from "@/types/agent-adapter";

export interface IConnectedAgent extends Document {
  // Identity
  agentId: string;          // unique string key, e.g. "cloud-billing-agent"
  agentName: string;
  provider: AgentProvider;
  organizationId: string;

  // Auth
  secretTokenHash: string;  // SHA-256 of raw token — never store plaintext
  role: string;             // e.g. "cloud_billing", "treasury", "payroll"
  status: "online" | "offline" | "disconnected" | "disabled";

  // Link to internal Agent record (for policy + wallet lookup)
  linkedAgentId?: mongoose.Types.ObjectId;

  // Heartbeat tracking
  lastSeen: Date;
  latencyMs: number;

  // Daily statistics (reset each day by the heartbeat handler)
  requestsToday: number;
  approvedCount: number;
  blockedCount: number;
  pendingCount: number;
  averageRisk: number;
  lastActivity: Date;

  createdAt: Date;
  updatedAt: Date;
}

const ConnectedAgentSchema = new Schema<IConnectedAgent>(
  {
    agentId: { type: String, required: true, unique: true, index: true },
    agentName: { type: String, required: true },
    provider: {
      type: String,
      enum: ["lyzr", "simulator", "future"],
      required: true,
      index: true,
    },
    organizationId: { type: String, required: true, index: true },
    secretTokenHash: { type: String, required: true },
    role: { type: String, required: true },
    status: {
      type: String,
      enum: ["online", "offline", "disconnected", "disabled"],
      default: "offline",
      index: true,
    },
    linkedAgentId: {
      type: Schema.Types.ObjectId,
      ref: "Agent",
    },
    lastSeen: { type: Date, default: Date.now },
    latencyMs: { type: Number, default: 0 },
    requestsToday: { type: Number, default: 0 },
    approvedCount: { type: Number, default: 0 },
    blockedCount: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },
    averageRisk: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const ConnectedAgent: Model<IConnectedAgent> =
  mongoose.models.ConnectedAgent ||
  mongoose.model<IConnectedAgent>("ConnectedAgent", ConnectedAgentSchema);

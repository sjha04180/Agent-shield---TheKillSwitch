import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAgentActivity extends Document {
  agentId: mongoose.Types.ObjectId;
  activityType: 'CREATED' | 'STARTED' | 'PAUSED' | 'RESUMED' | 'FROZEN' | 'TERMINATED' | 'TX_REQUESTED' | 'TX_APPROVED' | 'TX_BLOCKED' | 'TX_REJECTED';
  details: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

const AgentActivitySchema = new Schema<IAgentActivity>({
  agentId: { type: Schema.Types.ObjectId, ref: "Agent", required: true, index: true },
  activityType: {
    type: String,
    enum: ['CREATED', 'STARTED', 'PAUSED', 'RESUMED', 'FROZEN', 'TERMINATED', 'TX_REQUESTED', 'TX_APPROVED', 'TX_BLOCKED', 'TX_REJECTED'],
    required: true,
    index: true
  },
  details: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'timestamp', updatedAt: false } });

export const AgentActivity: Model<IAgentActivity> =
  mongoose.models.AgentActivity || mongoose.model<IAgentActivity>("AgentActivity", AgentActivitySchema);

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRiskAnalysis extends Document {
  transactionId: string;
  agentId: mongoose.Types.ObjectId;
  riskScore: number;
  factorsTriggered: string[];
  timestamp: Date;
}

const RiskAnalysisSchema = new Schema<IRiskAnalysis>({
  transactionId: { type: String, required: true, index: true },
  agentId: { type: Schema.Types.ObjectId, ref: "Agent", required: true, index: true },
  riskScore: { type: Number, required: true },
  factorsTriggered: [{ type: String }],
  timestamp: { type: Date, default: Date.now }
}, { timestamps: { createdAt: "timestamp", updatedAt: false } });

export const RiskAnalysis: Model<IRiskAnalysis> =
  mongoose.models.RiskAnalysis || mongoose.model<IRiskAnalysis>("RiskAnalysis", RiskAnalysisSchema);

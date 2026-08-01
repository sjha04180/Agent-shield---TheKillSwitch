import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRuleResult {
  ruleName: string;
  status: "PASS" | "WARNING" | "FAIL";
  message: string;
}

export interface IValidationLog extends Document {
  agentId: mongoose.Types.ObjectId;
  policyId: mongoose.Types.ObjectId;
  transactionId: string; // reference to AgentTransaction transactionId hash
  recipient: string;
  amount: number;
  token: string;
  status: "Approved" | "Blocked" | "Pending Manual Review";
  riskScore: number;
  rulesTriggered: IRuleResult[];
  timestamp: Date;
}

const ValidationLogSchema = new Schema<IValidationLog>({
  agentId: { type: Schema.Types.ObjectId, ref: "Agent", required: true, index: true },
  policyId: { type: Schema.Types.ObjectId, ref: "Policy", required: true, index: true },
  transactionId: { type: String, required: true, index: true },
  recipient: { type: String, required: true, lowercase: true },
  amount: { type: Number, required: true },
  token: { type: String, required: true },
  status: {
    type: String,
    enum: ["Approved", "Blocked", "Pending Manual Review"],
    required: true,
    index: true
  },
  riskScore: { type: Number, required: true },
  rulesTriggered: [{
    ruleName: { type: String, required: true },
    status: { type: String, enum: ["PASS", "WARNING", "FAIL"], required: true },
    message: { type: String, required: true }
  }],
  timestamp: { type: Date, default: Date.now }
}, { timestamps: { createdAt: "timestamp", updatedAt: false } });

export const ValidationLog: Model<IValidationLog> =
  mongoose.models.ValidationLog || mongoose.model<IValidationLog>("ValidationLog", ValidationLogSchema);

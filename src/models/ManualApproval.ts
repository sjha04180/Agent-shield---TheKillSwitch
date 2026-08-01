import mongoose, { Schema, Document, Model } from "mongoose";

export interface IManualApproval extends Document {
  transactionId: string;
  agentId: mongoose.Types.ObjectId;
  recipient: string;
  amount: number;
  token: string;
  status: "Pending" | "Approved" | "Rejected";
  reason: string;
  requestedAt: Date;
  decisionAt?: Date;
  decidedBy?: mongoose.Types.ObjectId;
}

const ManualApprovalSchema = new Schema<IManualApproval>({
  transactionId: { type: String, required: true, index: true },
  agentId: { type: Schema.Types.ObjectId, ref: "Agent", required: true, index: true },
  recipient: { type: String, required: true, lowercase: true },
  amount: { type: Number, required: true },
  token: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending", index: true },
  reason: { type: String, required: true },
  requestedAt: { type: Date, default: Date.now },
  decisionAt: { type: Date },
  decidedBy: { type: Schema.Types.ObjectId, ref: "User" }
}, { timestamps: { createdAt: "requestedAt", updatedAt: true } });

export const ManualApproval: Model<IManualApproval> =
  mongoose.models.ManualApproval || mongoose.model<IManualApproval>("ManualApproval", ManualApprovalSchema);

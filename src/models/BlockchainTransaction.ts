import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBlockchainTransaction extends Document {
  hash: string;
  blockNumber: number;
  gasUsed: string;
  status: "success" | "reverted";
  walletAddress: string;
  agentId: mongoose.Types.ObjectId;
  policyId: mongoose.Types.ObjectId;
  actionType: string;
  timestamp: Date;
}

const BlockchainTransactionSchema = new Schema<IBlockchainTransaction>({
  hash: { type: String, required: true, unique: true, index: true },
  blockNumber: { type: Number, required: true },
  gasUsed: { type: String, required: true },
  status: { type: String, enum: ["success", "reverted"], required: true, index: true },
  walletAddress: { type: String, required: true, lowercase: true, index: true },
  agentId: { type: Schema.Types.ObjectId, ref: "Agent", required: true, index: true },
  policyId: { type: Schema.Types.ObjectId, ref: "Policy", required: true, index: true },
  actionType: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: { createdAt: "timestamp", updatedAt: false } });

export const BlockchainTransaction: Model<IBlockchainTransaction> =
  mongoose.models.BlockchainTransaction || mongoose.model<IBlockchainTransaction>("BlockchainTransaction", BlockchainTransactionSchema);

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAgentTransaction extends Document {
  transactionId: string;
  agentId: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  recipient: string;
  token: string;
  network: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'blocked' | 'rejected' | 'executed';
  timestamp: Date;
}

const AgentTransactionSchema = new Schema<IAgentTransaction>({
  transactionId: { type: String, required: true, unique: true, index: true },
  agentId: { type: Schema.Types.ObjectId, ref: "Agent", required: true, index: true },
  walletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: true, index: true },
  recipient: { type: String, required: true, lowercase: true, index: true },
  token: { type: String, required: true },
  network: { type: String, required: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'blocked', 'rejected', 'executed'],
    default: 'pending',
    index: true
  },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'timestamp', updatedAt: true } });

export const AgentTransaction: Model<IAgentTransaction> =
  mongoose.models.AgentTransaction || mongoose.model<IAgentTransaction>("AgentTransaction", AgentTransactionSchema);

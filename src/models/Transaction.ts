import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransaction extends Document {
  agentId: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  to: string;
  value: string;
  data: string;
  tokenAddress?: string;
  status: 'pending' | 'approved' | 'blocked' | 'failed' | 'completed';
  rejectionReason?: string;
  txHash?: string;
  gasUsed?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
  walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
  to: { type: String, required: true, lowercase: true, index: true },
  value: { type: String, required: true },
  data: { type: String, required: true, default: '0x' },
  tokenAddress: { type: String, lowercase: true },
  status: { type: String, enum: ['pending', 'approved', 'blocked', 'failed', 'completed'], required: true, index: true },
  rejectionReason: { type: String },
  txHash: { type: String, lowercase: true },
  gasUsed: { type: Number }
}, { timestamps: true });

export const Transaction: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

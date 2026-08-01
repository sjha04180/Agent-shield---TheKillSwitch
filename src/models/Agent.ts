import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAgent extends Document {
  ownerId: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  purpose: string;
  network: string;
  spendingLimit: number; // default limit
  status: 'draft' | 'active' | 'paused' | 'frozen' | 'blocked' | 'archived';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  allowedTokens: string[];
  avatar: string;
  tags: string[];
  policyId?: mongoose.Types.ObjectId;
  apiKeyHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  purpose: { type: String, required: true },
  network: { type: String, required: true, default: "Sepolia" },
  spendingLimit: { type: Number, required: true, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'frozen', 'blocked', 'archived'],
    default: 'draft',
    index: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
    index: true
  },
  allowedTokens: [{ type: String, uppercase: true }],
  avatar: { type: String, default: "" },
  tags: [{ type: String }],
  policyId: { type: Schema.Types.ObjectId, ref: 'Policy' },
  apiKeyHash: { type: String, required: true, unique: true }
}, { timestamps: true });

export const Agent: Model<IAgent> = mongoose.models.Agent || mongoose.model<IAgent>('Agent', AgentSchema);

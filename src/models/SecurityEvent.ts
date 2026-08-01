import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISecurityEvent extends Document {
  agentId?: mongoose.Types.ObjectId;
  walletId?: mongoose.Types.ObjectId;
  eventType: 'POLICY_BREACH' | 'UNAUTHORIZED_ACCESS' | 'KILLSWITCH_TRIGGERED' | 'ANOMALY_DETECTED';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  metadata: Record<string, any>;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SecurityEventSchema = new Schema<ISecurityEvent>({
  agentId: { type: Schema.Types.ObjectId, ref: 'Agent', index: true },
  walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', index: true },
  eventType: { type: String, enum: ['POLICY_BREACH', 'UNAUTHORIZED_ACCESS', 'KILLSWITCH_TRIGGERED', 'ANOMALY_DETECTED'], required: true, index: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true, default: 'medium' },
  details: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  resolved: { type: Boolean, default: false, index: true }
}, { timestamps: true });

export const SecurityEvent: Model<ISecurityEvent> = mongoose.models.SecurityEvent || mongoose.model<ISecurityEvent>('SecurityEvent', SecurityEventSchema);

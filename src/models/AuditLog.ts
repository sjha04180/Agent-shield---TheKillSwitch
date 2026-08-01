import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  agentId?: mongoose.Types.ObjectId;
  action: string;
  details: string;
  metadata: Record<string, any>;
  ipAddress: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  agentId: { type: Schema.Types.ObjectId, ref: 'Agent', index: true },
  action: { type: String, required: true, index: true },
  details: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  ipAddress: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

export const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAIUsage extends Document {
  userId: mongoose.Types.ObjectId;
  requestsToday: number;
  tokenUsage: number;
  avgResponseTime: number;
  lastRequestAt: Date;
}

const AIUsageSchema = new Schema<IAIUsage>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  requestsToday: { type: Number, default: 0 },
  tokenUsage: { type: Number, default: 0 },
  avgResponseTime: { type: Number, default: 0 },
  lastRequestAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const AIUsage: Model<IAIUsage> =
  mongoose.models.AIUsage || mongoose.model<IAIUsage>("AIUsage", AIUsageSchema);

import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemConfig extends Document {
  demoMode: boolean;
  lyzrEnabled: boolean;
  simulatorSpeed: "normal" | "fast" | "stress";
  autoDemo: boolean;
  blockchainSimulation: boolean;
  geminiEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SystemConfigSchema = new Schema<ISystemConfig>(
  {
    demoMode: { type: Boolean, default: true },
    lyzrEnabled: { type: Boolean, default: true },
    simulatorSpeed: { type: String, enum: ["normal", "fast", "stress"], default: "normal" },
    autoDemo: { type: Boolean, default: false },
    blockchainSimulation: { type: Boolean, default: true },
    geminiEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const SystemConfig: Model<ISystemConfig> =
  mongoose.models.SystemConfig ||
  mongoose.model<ISystemConfig>("SystemConfig", SystemConfigSchema);

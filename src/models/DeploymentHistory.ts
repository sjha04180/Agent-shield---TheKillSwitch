import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDeploymentHistory extends Document {
  contractName: string;
  address: string;
  network: string;
  txHash: string;
  compiler: string;
  deployedBy: string;
  timestamp: Date;
}

const DeploymentHistorySchema = new Schema<IDeploymentHistory>({
  contractName: { type: String, required: true, index: true },
  address: { type: String, required: true, lowercase: true, unique: true, index: true },
  network: { type: String, required: true, index: true },
  txHash: { type: String, required: true },
  compiler: { type: String, required: true },
  deployedBy: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: { createdAt: "timestamp", updatedAt: false } });

export const DeploymentHistory: Model<IDeploymentHistory> =
  mongoose.models.DeploymentHistory || mongoose.model<IDeploymentHistory>("DeploymentHistory", DeploymentHistorySchema);

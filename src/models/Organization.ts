import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  industry: string;
  country: string;
  status: "active" | "suspended";
  walletCount: number;
  agentCount: number;
  riskScore: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>({
  name: { type: String, required: true, unique: true, index: true },
  industry: { type: String, required: true },
  country: { type: String, required: true },
  status: { type: String, enum: ["active", "suspended"], default: "active", index: true },
  walletCount: { type: Number, default: 0 },
  agentCount: { type: Number, default: 0 },
  riskScore: { type: Number, default: 10, min: 0, max: 100 }
}, { timestamps: true });

export const Organization: Model<IOrganization> =
  mongoose.models.Organization || mongoose.model<IOrganization>("Organization", OrganizationSchema);

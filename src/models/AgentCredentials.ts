import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAgentCredentials extends Document {
  agentId: string;
  agentName: string;
  provider: string;
  agentToken: string;
  status: "active" | "disabled";
  createdAt: Date;
  updatedAt: Date;
}

const AgentCredentialsSchema = new Schema<IAgentCredentials>(
  {
    agentId: { type: String, required: true, unique: true },
    agentName: { type: String, required: true },
    provider: { type: String, required: true },
    agentToken: { type: String, required: true },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
  },
  { timestamps: true }
);

export const AgentCredentials: Model<IAgentCredentials> =
  mongoose.models.AgentCredentials ||
  mongoose.model<IAgentCredentials>("AgentCredentials", AgentCredentialsSchema);

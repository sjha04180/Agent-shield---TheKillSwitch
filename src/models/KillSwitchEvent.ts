import mongoose, { Schema, Document, Model } from "mongoose";

export interface IKillSwitchEvent extends Document {
  status: "activated" | "deactivated";
  triggeredBy?: mongoose.Types.ObjectId; // Empty if auto-triggered
  triggerType: "manual" | "automatic";
  reason: string;
  timestamp: Date;
}

const KillSwitchEventSchema = new Schema<IKillSwitchEvent>({
  status: { type: String, enum: ["activated", "deactivated"], required: true, index: true },
  triggeredBy: { type: Schema.Types.ObjectId, ref: "User" },
  triggerType: { type: String, enum: ["manual", "automatic"], required: true },
  reason: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: { createdAt: "timestamp", updatedAt: false } });

export const KillSwitchEvent: Model<IKillSwitchEvent> =
  mongoose.models.KillSwitchEvent || mongoose.model<IKillSwitchEvent>("KillSwitchEvent", KillSwitchEventSchema);

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage {
  role: "user" | "model" | "system";
  content: string;
  timestamp: Date;
}

export interface IAIChat extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  role: { type: String, enum: ["user", "model", "system"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const AIChatSchema = new Schema<IAIChat>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, default: "New Conversation" },
  messages: [MessageSchema]
}, { timestamps: true });

export const AIChat: Model<IAIChat> =
  mongoose.models.AIChat || mongoose.model<IAIChat>("AIChat", AIChatSchema);

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReport extends Document {
  title: string;
  reportType: "Daily" | "Weekly" | "Monthly";
  format: "PDF" | "CSV";
  path: string;
  size: string;
  generatedBy: mongoose.Types.ObjectId;
  generatedAt: Date;
}

const ReportSchema = new Schema<IReport>({
  title: { type: String, required: true },
  reportType: { type: String, enum: ["Daily", "Weekly", "Monthly"], required: true, index: true },
  format: { type: String, enum: ["PDF", "CSV"], required: true },
  path: { type: String, required: true },
  size: { type: String, required: true },
  generatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: "generatedAt", updatedAt: false } });

export const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);

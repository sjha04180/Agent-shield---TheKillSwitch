import mongoose, { Schema, Document, Model } from "mongoose";

export interface IContractEvent extends Document {
  contractAddress: string;
  eventName: string; // e.g. "WalletFrozen", "TransactionExecuted"
  params: Record<string, any>;
  transactionHash: string;
  blockNumber: number;
  timestamp: Date;
}

const ContractEventSchema = new Schema<IContractEvent>({
  contractAddress: { type: String, required: true, lowercase: true, index: true },
  eventName: { type: String, required: true, index: true },
  params: { type: Schema.Types.Mixed, default: {} },
  transactionHash: { type: String, required: true, index: true },
  blockNumber: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: { createdAt: "timestamp", updatedAt: false } });

export const ContractEvent: Model<IContractEvent> =
  mongoose.models.ContractEvent || mongoose.model<IContractEvent>("ContractEvent", ContractEventSchema);

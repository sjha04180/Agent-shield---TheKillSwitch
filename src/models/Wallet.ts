import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWallet extends Document {
  ownerId: mongoose.Types.ObjectId;
  address: string;
  name: string;
  chainId: number;
  walletType: 'EOA' | 'Safe' | 'ERC4337';
  status: 'active' | 'frozen';
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  address: { type: String, required: true, unique: true, index: true, lowercase: true },
  name: { type: String, required: true },
  chainId: { type: Number, required: true },
  walletType: { type: String, enum: ['EOA', 'Safe', 'ERC4337'], default: 'ERC4337' },
  status: { type: String, enum: ['active', 'frozen'], default: 'active' },
}, { timestamps: true });

export const Wallet: Model<IWallet> = mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', WalletSchema);

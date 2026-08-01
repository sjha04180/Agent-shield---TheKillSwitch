import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPolicy extends Document {
  name: string;
  description: string;
  status: "active" | "disabled";
  createdBy: mongoose.Types.ObjectId;
  
  // Transaction Limits
  maxSingleTx: number;
  maxDailySpent: number;
  maxWeeklySpent: number;
  maxMonthlySpent: number;
  maxTxPerHour: number;
  maxTxPerDay: number;

  // Wallet Restrictions
  allowedWallets: string[];
  blockedWallets: string[];
  allowedContracts: string[];
  blockedContracts: string[];
  allowedTokens: string[];
  blockedTokens: string[];
  allowedNetworks: number[];

  // Time Restrictions
  businessHoursOnly: boolean;
  businessStartHour: number; // 0-23
  businessEndHour: number;   // 0-23
  weekdaysOnly: boolean;
  noWeekends: boolean;
  timezone: string;
  holidayLock: boolean;

  // Risk Controls
  maxRiskScore: number;
  requireManualApproval: boolean;
  blockUnknownMerchants: boolean;
  blockHighRiskVendors: boolean;
  blockNewWallets: boolean;

  // Emergency Controls
  emergencyFreezeEnabled: boolean;
  killSwitchEnabled: boolean;
  autoPauseAgent: boolean;
  autoLockWallet: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const PolicySchema = new Schema<IPolicy>({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: "" },
  status: { type: String, enum: ["active", "disabled"], default: "active", index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

  // Limits
  maxSingleTx: { type: Number, default: 0 }, // 0 = unlimited
  maxDailySpent: { type: Number, default: 0 },
  maxWeeklySpent: { type: Number, default: 0 },
  maxMonthlySpent: { type: Number, default: 0 },
  maxTxPerHour: { type: Number, default: 0 },
  maxTxPerDay: { type: Number, default: 0 },

  // Wallets & Network
  allowedWallets: [{ type: String, lowercase: true }],
  blockedWallets: [{ type: String, lowercase: true }],
  allowedContracts: [{ type: String, lowercase: true }],
  blockedContracts: [{ type: String, lowercase: true }],
  allowedTokens: [{ type: String, uppercase: true }],
  blockedTokens: [{ type: String, uppercase: true }],
  allowedNetworks: [{ type: Number }],

  // Times
  businessHoursOnly: { type: Boolean, default: false },
  businessStartHour: { type: Number, default: 9, min: 0, max: 23 },
  businessEndHour: { type: Number, default: 17, min: 0, max: 23 },
  weekdaysOnly: { type: Boolean, default: false },
  noWeekends: { type: Boolean, default: false },
  timezone: { type: String, default: "UTC" },
  holidayLock: { type: Boolean, default: false },

  // Risks
  maxRiskScore: { type: Number, default: 80, min: 0, max: 100 },
  requireManualApproval: { type: Boolean, default: false },
  blockUnknownMerchants: { type: Boolean, default: false },
  blockHighRiskVendors: { type: Boolean, default: false },
  blockNewWallets: { type: Boolean, default: false },

  // Emergencies
  emergencyFreezeEnabled: { type: Boolean, default: true },
  killSwitchEnabled: { type: Boolean, default: true },
  autoPauseAgent: { type: Boolean, default: true },
  autoLockWallet: { type: Boolean, default: true },
}, { timestamps: true });

export const Policy: Model<IPolicy> = mongoose.models.Policy || mongoose.model<IPolicy>("Policy", PolicySchema);

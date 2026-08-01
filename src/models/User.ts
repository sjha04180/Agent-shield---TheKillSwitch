import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  image?: string;
  role: 'owner' | 'admin';
  passwordHash?: string;
  organization?: string;
  timezone?: string;
  status?: "active" | "suspended";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  image: { type: String },
  role: { type: String, enum: ['owner', 'admin'], default: 'owner' },
  passwordHash: { type: String },
  organization: { type: String, default: '' },
  timezone: { type: String, default: 'UTC' },
  status: { type: String, enum: ["active", "suspended"], default: "active", index: true }
}, { timestamps: true });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

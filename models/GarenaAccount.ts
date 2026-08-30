import mongoose, { Schema, Document } from 'mongoose';

export interface IGarenaAccount extends Document {
  userId?: mongoose.Types.ObjectId | string;
  username: string;
  password?: string;
  accountNickname: string;
  region: 'MY' | 'SG' | 'ID' | 'TH' | 'BD' | 'GLOBAL';
  authCookie?: string;
  shellsBalance: number;
  status: 'ACTIVE' | 'LOGGED_OUT' | 'SESSION_EXPIRED' | 'AUTHENTICATION_FAILED' | 'LOCKED';
  isPrimary: boolean;
  lastLoginAt?: Date;
  lastBalanceSyncAt?: Date;
  lastErrorMessage?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const GarenaAccountSchema = new Schema<IGarenaAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    username: { type: String, required: true, trim: true },
    password: { type: String, default: '' },
    accountNickname: { type: String, default: 'Primary Garena Account' },
    region: {
      type: String,
      enum: ['MY', 'SG', 'ID', 'TH', 'BD', 'GLOBAL'],
      default: 'MY',
    },
    authCookie: { type: String, default: '' },
    shellsBalance: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['ACTIVE', 'LOGGED_OUT', 'SESSION_EXPIRED', 'AUTHENTICATION_FAILED', 'LOCKED'],
      default: 'ACTIVE',
    },
    isPrimary: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    lastBalanceSyncAt: { type: Date, default: Date.now },
    lastErrorMessage: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

if (mongoose.models.GarenaAccount) {
  delete mongoose.models.GarenaAccount;
}

export default mongoose.model<IGarenaAccount>('GarenaAccount', GarenaAccountSchema);

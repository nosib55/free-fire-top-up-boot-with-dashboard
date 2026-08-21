import mongoose, { Schema, Document } from 'mongoose';

export interface IApiKey extends Document {
  key: string;
  name: string;
  ownerId?: mongoose.Types.ObjectId;
  userRef?: mongoose.Types.ObjectId;
  resellerId?: mongoose.Types.ObjectId;
  planId?: mongoose.Types.ObjectId;
  role: string;
  totalHits: number;
  remainingHits: number;
  usedHits: number;
  totalLimit?: number;
  usedCount?: number;
  rateLimitRPS: number;
  expiresAt: Date;
  allowedIPs?: string[];
  status: string;
  isActive?: boolean;
  lastUpdated?: Date;
  consecutiveInvalidVouchers?: number;
  lastInvalidVoucherAt?: Date;
  webhookUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: 'API Key' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    userRef: { type: Schema.Types.ObjectId, ref: 'User' },
    resellerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', default: null },
    role: { type: String, default: 'user' },
    totalHits: { type: Number, default: 1000 },
    remainingHits: { type: Number, default: 1000 },
    usedHits: { type: Number, default: 0 },
    totalLimit: { type: Number, default: 1000 },
    usedCount: { type: Number, default: 0 },
    rateLimitRPS: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true, index: true },
    allowedIPs: { type: [String], default: [] },
    status: { type: String, default: 'active' },
    isActive: { type: Boolean, default: true },
    lastUpdated: { type: Date, default: Date.now },
    consecutiveInvalidVouchers: { type: Number, default: 0 },
    lastInvalidVoucherAt: { type: Date, default: null },
    webhookUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

if (mongoose.models.ApiKey) {
  delete mongoose.models.ApiKey;
}

export default mongoose.model<IApiKey>('ApiKey', ApiKeySchema);

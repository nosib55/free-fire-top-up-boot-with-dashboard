import mongoose, { Schema, Document } from 'mongoose';

export interface IReseller extends Document {
  userId: mongoose.Types.ObjectId;
  brandingTag: string;
  masterQuotaBalance: number;
  allocatedQuota: number;
  discountRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const ResellerSchema = new Schema<IReseller>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    brandingTag: { type: String, required: true, unique: true, uppercase: true },
    masterQuotaBalance: { type: Number, default: 0 },
    allocatedQuota: { type: Number, default: 0 },
    discountRate: { type: Number, default: 15 },
  },
  { timestamps: true }
);

export default mongoose.models.Reseller || mongoose.model<IReseller>('Reseller', ResellerSchema);

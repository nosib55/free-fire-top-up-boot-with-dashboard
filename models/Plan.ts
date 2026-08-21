import mongoose, { Schema, Document } from 'mongoose';

export interface IPlan extends Document {
  name: string;
  totalQuota: number;
  price: number;
  durationDays: number;
  rateLimitRPS: number;
  isResellerPlan: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true, unique: true },
    totalQuota: { type: Number, required: true },
    price: { type: Number, required: true },
    durationDays: { type: Number, default: 30 },
    rateLimitRPS: { type: Number, default: 5 },
    isResellerPlan: { type: Boolean, default: false },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Plan || mongoose.model<IPlan>('Plan', PlanSchema);

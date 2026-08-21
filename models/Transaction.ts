import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  txId: string;
  userId: mongoose.Types.ObjectId;
  type: 'RECHARGE_REQUEST' | 'QUOTA_PURCHASE' | 'RESELLER_ALLOCATION' | 'TOPUP_DEDUCTION' | 'ABUSE_PENALTY';
  paymentMethod?: 'bKash' | 'Nagad' | 'Crypto' | 'Bank' | 'MasterQuota';
  amount: number;
  hits: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  proof?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    txId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['RECHARGE_REQUEST', 'QUOTA_PURCHASE', 'RESELLER_ALLOCATION', 'TOPUP_DEDUCTION', 'ABUSE_PENALTY'],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['bKash', 'Nagad', 'Crypto', 'Bank', 'MasterQuota'],
    },
    amount: { type: Number, required: true, default: 0 },
    hits: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
      default: 'PENDING',
    },
    proof: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

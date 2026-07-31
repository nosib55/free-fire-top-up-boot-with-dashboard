import mongoose, { Schema } from 'mongoose';

// voucher data structure or type
export type IVoucher = {
  code: string; // voucher code (like : BDMB-1234567890)
  prefix: string; // prefix (e.g., BDMB, UPBD)
  category: string; // game or category (Free Fire)
  status: 'Pending' | 'Success' | 'Failed'; // current status of the code
  createdAt?: Date;
};

// voucher schema or table structure
const VoucherSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    prefix: { type: String, required: true },
    category: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Success', 'Failed'],
      default: 'Pending',
    },
  },
  { timestamps: true },
);

// export the model
export default mongoose.models.Voucher ||
  mongoose.model('Voucher', VoucherSchema);

import mongoose, { Schema } from 'mongoose';

const VoucherSchema = new Schema(
  {
    serial: { type: String, required: true, unique: true },
    pin: { type: String, required: true },
    amount: { type: Number, required: true }, //20, 36, 80, 800 
    isUsed: { type: Boolean, default: false }, // after redeeming, it will be true
    redeemedAt: { type: Date, default: null },
    redeemedBy: { type: String, default: null }, // UID of the user who redeemed the voucher
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Voucher ||
  mongoose.model('Voucher', VoucherSchema);

import mongoose, { Schema } from 'mongoose';

const VoucherSchema = new Schema(
  {
    code: { type: String, index: true }, // Full voucher code string (e.g. BDMB-01-S-12345678 1234567890123456)
    serial: { type: String, index: true }, // Serial part (e.g. BDMB-01-S-12345678)
    pin: { type: String }, // PIN digits
    amount: { type: Number, default: 0 }, // Diamond amount e.g. 25, 50, 115, 240, etc.
    denomination: { type: String }, // e.g. "240 Diamonds"
    status: {
      type: String,
      enum: ['USED', 'INVALID', 'EXPIRED', 'PENDING'],
      default: 'USED',
      index: true,
    },
    isUsed: { type: Boolean, default: true, index: true },
    reason: { type: String, default: 'Redeemed or already consumed' },
    usedByUid: { type: String, default: null }, // UID of the player
    redeemedBy: { type: String, default: null }, // Backwards compatibility with previous field
    redeemedAt: { type: Date, default: Date.now },
    orderId: { type: String, default: null },
    resellerApiKey: { type: String, default: null },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Compound indexes for lightning-fast lookups
VoucherSchema.index({ serial: 1, isUsed: 1 });
VoucherSchema.index({ code: 1, isUsed: 1 });

export default mongoose.models.Voucher ||
  mongoose.model('Voucher', VoucherSchema);


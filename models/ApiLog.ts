import mongoose, { Schema } from 'mongoose';

const ApiLogSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    endpoint: { type: String, required: true },
    requestData: { type: Object },
    responseData: { type: Object },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
  },
  { timestamps: true },
);

export default mongoose.models.ApiLog || mongoose.model('ApiLog', ApiLogSchema);

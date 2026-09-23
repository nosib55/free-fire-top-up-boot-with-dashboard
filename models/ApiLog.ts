import mongoose, { Schema, Document } from 'mongoose';

export interface IApiLog extends Document {
  apiKey?: string;
  userId?: mongoose.Types.ObjectId;
  endpoint: string;
  uid?: string;
  voucherCode?: string;
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  status: string;
  latencyMs?: number;
  quotaDeducted: boolean;
  ipAddress?: string;
  errorDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApiLogSchema = new Schema<IApiLog>(
  {
    apiKey: { type: String, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    endpoint: { type: String, required: true },
    uid: { type: String },
    voucherCode: { type: String },
    requestData: { type: Object, default: {} },
    responseData: { type: Object, default: {} },
    status: {
      type: String,
      required: true,
      index: true,
    },
    latencyMs: { type: Number, default: 0 },
    quotaDeducted: { type: Boolean, default: false },
    ipAddress: { type: String },
    errorDetails: { type: String, default: '' },
  },
  { timestamps: true }
);

// Clear cached compiled model if already registered in hot-reload
if (mongoose.models.ApiLog) {
  delete mongoose.models.ApiLog;
}

export default mongoose.model<IApiLog>('ApiLog', ApiLogSchema);


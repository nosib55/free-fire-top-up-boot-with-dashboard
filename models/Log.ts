import mongoose, { Schema } from 'mongoose';

export type ILog ={
  message: string; // bot's action message (e.g., "5 codes processed successfully")
  type: 'info' | 'success' | 'error'; // log type
  createdAt: Date;
}

const LogSchema = new Schema(
  {
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'error'], default: 'info' },
  },
  { timestamps: true },
);

// when mongoose.models.Log exists, use it; otherwise, create a new model
export default mongoose.models.Log || mongoose.model('Log', LogSchema);

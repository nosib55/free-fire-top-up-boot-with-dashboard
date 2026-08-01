import mongoose, { Schema } from 'mongoose';

export type IUser = {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'reseller' | 'user';
  apiKey?: string;
  requestLimit: number;
}

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'reseller', 'user'],
      default: 'user',
    },
    apiKey: { type: String, unique: true, sparse: true },
    requestLimit: { type: Number, default: 1000 },
  },
  { timestamps: true },
);

export default mongoose.models.User ||
  mongoose.model('User', UserSchema);

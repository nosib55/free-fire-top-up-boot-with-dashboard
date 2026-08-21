import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  passwordHash?: string;
  role: string;
  status: string;
  hitBalance: number;
  balance?: number;
  requestLimit?: number;
  apiKey?: string;
  resellerProfile?: {
    assignedLimit?: number;
    usedLimit?: number;
    prefixTag?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, default: '' },
    password: { type: String },
    passwordHash: { type: String },
    role: { type: String, default: 'user' },
    status: { type: String, default: 'active' },
    hitBalance: { type: Number, default: 1000, min: 0 },
    balance: { type: Number, default: 0 },
    requestLimit: { type: Number, default: 1000 },
    apiKey: { type: String, sparse: true },
    resellerProfile: {
      assignedLimit: { type: Number, default: 0 },
      usedLimit: { type: Number, default: 0 },
      prefixTag: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

if (mongoose.models.User) {
  delete mongoose.models.User;
}

export default mongoose.model<IUser>('User', UserSchema);

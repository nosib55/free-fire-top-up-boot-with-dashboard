import mongoose, { Schema } from 'mongoose';

export type IAdmin = {
  email: string;
  passwordHash: string; // for secure password
}

const AdminSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.models.IAdmin ||
  mongoose.model('IAdmin', AdminSchema);

import mongoose, { Schema } from 'mongoose';

const PlayerSchema = new Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    playerName: {
      type: String,
      required: true,
    },
    region: {
      type: String,
      default: 'BD',
    },
    openId: {
      type: String,
      default: null,
    },
    lastLookedUpAt: {
      type: Date,
      default: Date.now,
    },
    lookupCount: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Player || mongoose.model('Player', PlayerSchema);

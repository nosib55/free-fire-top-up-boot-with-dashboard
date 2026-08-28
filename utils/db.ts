import mongoose from 'mongoose';

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    return;
  }

  // check if connection is already done
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  // new connection build
  try {
    await mongoose.connect(MONGODB_URI as string);
    console.log('MongoDB Connected Successfully!');
  } catch (error) {
    console.log('MongoDB Connection Failed!', error);
  }
}

export default dbConnect;

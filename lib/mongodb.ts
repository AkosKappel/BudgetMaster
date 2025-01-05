import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || '';

if (!MONGO_URI) {
  throw new Error('Please define the MONGO_URI environment variable');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { connection: null, promise: null };
}

export async function connectToDb() {
  if (cached.connection) {
    return cached.connection;
  }

  if (!cached.promise) {
    console.info('Connecting to MongoDB');
    cached.promise = mongoose.connect(MONGO_URI).then((mongoose) => mongoose);
  }

  cached.connection = await cached.promise;
  return cached.connection;
}

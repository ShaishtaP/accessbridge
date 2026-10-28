import mongoose from 'mongoose';

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

// Connects to MongoDB Atlas. Throws a readable error instead of hanging forever.
export async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Copy server/.env.example to server/.env and fill it in.');
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB connected (database: ${mongoose.connection.name})`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

// Human-readable connection state, used by the health check.
export function dbStatus() {
  return STATES[mongoose.connection.readyState] ?? 'unknown';
}

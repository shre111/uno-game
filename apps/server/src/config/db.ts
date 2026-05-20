import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  mongoose.connection.on('connected', () =>
    console.log('[MongoDB] Connected successfully')
  );
  mongoose.connection.on('error', (err) =>
    console.error('[MongoDB] Connection error:', err)
  );
  mongoose.connection.on('disconnected', () =>
    console.warn('[MongoDB] Disconnected')
  );

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
}

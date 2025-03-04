import mongoose, { ConnectOptions } from 'mongoose';


let cachedConnection: typeof mongoose | null = null;

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set');
}

const connectToMongoDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('Using existing database connection');
    return mongoose.connection;
  }

  try {
    console.log('Creating new database connection');
    
    const options: ConnectOptions = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    } as ConnectOptions;
    
    const conn = await mongoose.connect(MONGODB_URI, options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    cachedConnection = conn;
    
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return null;
  }
};

connectToMongoDB();

export const getConnection = async () => {
  return await connectToMongoDB();
};

export default mongoose.connection;

import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
    console.log(`📦 MongoDB connected: ${connectionInstance.connection.db.databaseName}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1); // Stop the app if DB connection fails
  }
};

export default connectDB;

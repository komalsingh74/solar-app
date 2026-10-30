
import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured");
  }

  mongoose.set("strictQuery", true);

  const connection = await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  console.log(
    `MongoDB connected: ${connection.connection.host}`
  );
};

export default connectDB;

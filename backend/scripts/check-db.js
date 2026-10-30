import "dotenv/config";
import mongoose from "mongoose";

// Print connectivity results only; never expose the URI or credentials.
try {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not configured");
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 5000,
  });
  await mongoose.connection.db.admin().ping();
  console.log("MongoDB connection and ping: OK");
} catch (error) {
  console.error("MongoDB connection failed:", error.name);
  for (const server of error.reason?.servers?.values() || []) {
    console.error("Server status:", server.type, server.error?.name,
      server.error?.cause?.code || "");
  }
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

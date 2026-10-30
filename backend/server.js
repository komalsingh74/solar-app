
import "dotenv/config";

import http from "node:http";
import mongoose from "mongoose";

import app from "./app.js";
import connectDB from "./config/db.js";
import validateEnv from "./middleware/validateEnv.js";

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  validateEnv();

  // Connect to MongoDB before accepting requests
  await connectDB();

  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });

  let shuttingDown = false;

  const shutdown = (signal) => {
    if (shuttingDown) return;

    shuttingDown = true;
    console.log(`${signal} received. Shutting down...`);

    const forceExit = setTimeout(() => {
      console.error("Graceful shutdown timed out");
      process.exit(1);
    }, 10000);

    forceExit.unref();

    server.close(async (error) => {
      try {
        await mongoose.disconnect();

        if (error) {
          console.error("HTTP server shutdown failed:", error);
          process.exitCode = 1;
        }
      } catch (dbError) {
        console.error("Database shutdown failed:", dbError);
        process.exitCode = 1;
      } finally {
        clearTimeout(forceExit);
        process.exit();
      }
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (error) => {
    console.error("Unhandled promise rejection:", error);
    shutdown("unhandledRejection");
  });
};

startServer().catch((error) => { 
  console.error("Application startup failed:", error.message);
  process.exitCode = 1;
});

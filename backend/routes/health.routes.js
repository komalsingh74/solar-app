
import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (req, res) => {
  const dbConnected =
    mongoose.connection.readyState === 1;

  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    message: dbConnected
      ? "Solar CRM API is healthy"
      : "Database is unavailable",
    data: {
      api: "up",
      database: dbConnected ? "connected" : "disconnected",
    },
  });
});

export default router;

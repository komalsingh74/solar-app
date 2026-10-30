
import express from "express";
import cors from "cors";
import helmet from "helmet";

import healthRoutes from "./routes/health.routes.js";
import routes from "./routes/index.js";
import callRoutes from "./routes/call.routes.js";
import ivrRoutes from "./routes/ivr.routes.js";
import telephonyWebhook from "./webhooks/telephony.webhook.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

// Security headers
app.use(helmet());

// Cross-origin configuration
const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:3000,http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without Origin, e.g. server-to-server tools
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origin not allowed by CORS")
      );
    },
    credentials: true,
  })
);

// Site survey photos are compressed in the browser and persisted with the survey.
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Solar Panel Management API is running",
  });
});
// API routes
app.use("/api/health", healthRoutes);
app.use("/api/webhooks/telephony", telephonyWebhook);
app.use("/api", routes);
app.use("/api/calls", callRoutes);
app.use("/api/ivr", ivrRoutes);


// import indexRoutes from "./routes/index.js";
// app.use("/api", indexRoutes);

// Add feature routes here:

// 404 handler must come after all routes
app.use(notFound);

// Global error handler must always be last
app.use(errorHandler);

export default app;


import AppError from "../utils/AppError.js";

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let code = err.code || "INTERNAL_ERROR";

  const databaseUnavailable = [
    "MongoServerSelectionError",
    "MongooseServerSelectionError",
    "MongoNetworkError",
    "MongoNetworkTimeoutError",
  ].includes(err.name);

  if (databaseUnavailable) {
    statusCode = 503;
    message = "Database connection is temporarily unavailable. Please try again shortly.";
    code = "DATABASE_UNAVAILABLE";
    res.set("Retry-After", "5");
  }

  // Invalid MongoDB ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID";
    code = "INVALID_ID";
  }

  // Mongoose schema validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    code = "VALIDATION_ERROR";
  }

  // MongoDB unique index conflict
  if (err.code === 11000) {
    statusCode = 409;
    message = "A record with this value already exists";
    code = "DUPLICATE_RESOURCE";
  }

  // Malformed JSON request body
  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    "body" in err
  ) {
    statusCode = 400;
    message = "Invalid JSON request body";
    code = "INVALID_JSON";
  }

  const isOperational =
    databaseUnavailable ||
    err.isOperational === true ||
    err.name === "CastError" ||
    err.name === "ValidationError" ||
    err.code === 11000;

  // Log internal errors for debugging
  if (statusCode >= 500) {
    console.error("[SERVER ERROR]", {
      message: err.message,
      method: req.method,
      url: req.originalUrl,
      stack: err.stack,
    });
  } else {
    console.warn("[REQUEST ERROR]", {
      statusCode,
      code,
      message,
      url: req.originalUrl,
    });
  }

  // Hide internal implementation details in production
  if (statusCode >= 500 && !isOperational) {
    message = "Something went wrong";
    code = "INTERNAL_ERROR";
  }

  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  // Detailed errors only in development
  if (process.env.NODE_ENV !== "production") {
    response.error.details = err.details;
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;

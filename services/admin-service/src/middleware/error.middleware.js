const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "error-middleware" });

const errorHandler = (err, req, res, next) => {
  logger.error("Error occurred", {
    error: err.message,
    stack: err.stack,
    requestId: req.headers["x-request-id"],
    path: req.path,
    method: req.method,
  });

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      error: "Validation error",
      details: Object.values(err.errors).map((e) => e.message),
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      error: "Invalid ID format",
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      error: `Duplicate value for ${field}`,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  return res.status(statusCode).json({
    success: false,
    error: message,
  });
};

const notFound = (req, res) => {
  return res.status(404).json({
    success: false,
    error: "Route not found",
  });
};

module.exports = { errorHandler, notFound };

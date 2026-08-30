const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "error-middleware" });

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  logger.error("Unhandled error", {
    error: message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
};

module.exports = { errorHandler, notFound };

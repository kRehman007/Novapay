const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const transactionRoutes = require("./routes/transaction.routes");
const { errorHandler, notFound } = require("./middleware/error.middleware");
const { metricsMiddleware, getMetrics, getContentType } = require("./middleware/metrics.middleware");

const app = express();

// Metrics middleware
app.use(metricsMiddleware);

// Security middleware
app.use(helmet());
app.use(cors());

// Request parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan("combined"));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "transaction-service",
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", getContentType());
  res.end(await getMetrics());
});

// Routes
app.use("/api", transactionRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;

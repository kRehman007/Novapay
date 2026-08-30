const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const accountRoutes = require("./routes/account.routes");
const { errorHandler, notFound } = require("./middleware/error.middleware");

const app = express();

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
    service: "account-service",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api", accountRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;

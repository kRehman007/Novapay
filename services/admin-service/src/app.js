const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");

const adminRoutes = require("./routes/admin.routes");
const { errorHandler, notFound } = require("./middleware/error.middleware");
const { metricsMiddleware, getMetrics, getContentType } = require("./middleware/metrics.middleware");

const app = express();

// Metrics middleware
app.use(metricsMiddleware);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "admin-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", getContentType());
  res.end(await getMetrics());
});

app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

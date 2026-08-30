const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { authenticateToken } = require("./middleware/auth.middleware");
const { createRateLimiter } = require("./middleware/rateLimit.middleware");
const { errorHandler, notFound } = require("./middleware/error.middleware");
const gatewayRoutes = require("./routes/gateway.routes");
const { healthCheck } = require("./services/gateway.service");
const { createLogger } = require("./utils/logger");
const { metricsMiddleware, getMetrics, getContentType } = require("./middleware/metrics.middleware");

const app = express();
const logger = createLogger({ component: "app" });

// Metrics middleware
app.use(metricsMiddleware);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

const limiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
);
app.use("/api", limiter);

app.get("/health", async (req, res) => {
  try {
    const services = await healthCheck();
    const allHealthy = Object.values(services).every((s) => s.status === "healthy");

    res.status(allHealthy ? 200 : 503).json({
      success: true,
      service: "api-gateway",
      status: allHealthy ? "healthy" : "degraded",
      services,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: "api-gateway",
      status: "unhealthy",
      error: error.message,
    });
  }
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", getContentType());
  res.end(await getMetrics());
});

app.use("/api", authenticateToken, gatewayRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

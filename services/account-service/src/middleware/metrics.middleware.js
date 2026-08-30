const { Registry, Counter, Histogram, collectDefaultMetrics } = require("prom-client");

const register = new Registry();
collectDefaultMetrics({ register });

const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const httpRequestTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

const httpErrorsTotal = new Counter({
  name: "http_errors_total",
  help: "Total number of HTTP errors (4xx and 5xx)",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route ? req.route.path : req.path;
    const labels = {
      method: req.method,
      route: route,
      status_code: res.statusCode,
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);

    if (res.statusCode >= 400) {
      httpErrorsTotal.inc(labels);
    }
  });

  next();
}

async function getMetrics() {
  return register.metrics();
}

function getContentType() {
  return register.contentType;
}

module.exports = { metricsMiddleware, getMetrics, getContentType };

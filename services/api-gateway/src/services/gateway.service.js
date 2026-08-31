const axios = require("axios");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "gateway-service" });

const SERVICE_KEY = process.env.SERVICE_KEY || "7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH";

const SERVICES = {
  account:     { url: process.env.ACCOUNT_SERVICE_URL     || "http://localhost:4001", routes: ["/api/accounts", "/api/internal"] },
  transaction: { url: process.env.TRANSACTION_SERVICE_URL || "http://localhost:4002", routes: ["/api/transfers"] },
  ledger:      { url: process.env.LEDGER_SERVICE_URL      || "http://localhost:4003", routes: ["/api/ledger"] },
  fx:          { url: process.env.FX_SERVICE_URL          || "http://localhost:4004", routes: ["/api/fx"] },
  payroll:     { url: process.env.PAYROLL_SERVICE_URL     || "http://localhost:4005", routes: ["/api/payroll"] },
  admin:       { url: process.env.ADMIN_SERVICE_URL       || "http://localhost:4006", routes: ["/api/admin"] },
};

function getServiceForPath(path) {
  for (const [name, service] of Object.entries(SERVICES)) {
    for (const route of service.routes) {
      if (path.startsWith(route)) {
        return service;
      }
    }
  }
  return null;
}

async function proxyRequest(req, res) {
  const service = getServiceForPath(req.originalUrl);
  if (!service) {
    return res.status(404).json({ success: false, error: "No service found for path" });
  }

  const targetUrl = `${service.url}${req.originalUrl}`;

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        "Content-Type": req.headers["content-type"] || "application/json",
        "Authorization": req.headers["authorization"] || "",
        "X-Service-Key": SERVICE_KEY,
      },
      data: req.body,
      timeout: 30000,
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(502).json({ success: false, error: "Service unavailable" });
  }
}

async function healthCheck() {
  const results = {};

  for (const [name, service] of Object.entries(SERVICES)) {
    try {
      await axios.get(`${service.url}/health`, { timeout: 5000 });
      results[name] = { status: "healthy" };
    } catch (error) {
      results[name] = { status: "unhealthy", error: error.message };
    }
  }

  return results;
}

module.exports = { SERVICES, getServiceForPath, proxyRequest, healthCheck };

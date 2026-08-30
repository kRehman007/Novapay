const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "auth-middleware" });

const authenticateService = (req, res, next) => {
  try {
    const serviceKey = req.headers["x-service-key"];
    const expectedKey = process.env.SERVICE_KEY;

    if (!expectedKey) {
      return res.status(500).json({
        success: false,
        error: "Service key not configured",
      });
    }

    if (!serviceKey || serviceKey !== expectedKey) {
      return res.status(403).json({
        success: false,
        error: "Invalid service key",
      });
    }

    req.isServiceCall = true;
    next();
  } catch (error) {
    logger.error("Service auth middleware error", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "Service authentication error",
    });
  }
};

module.exports = { authenticateService };

const jwt = require("jsonwebtoken");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "auth-middleware" });

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Access token required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired",
      });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
      });
    }
    logger.error("Auth middleware error", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "Authentication error",
    });
  }
};

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

module.exports = { authenticateToken, authenticateService };

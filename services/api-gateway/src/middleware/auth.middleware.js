const jwt = require("jsonwebtoken");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "auth-middleware" });

const JWT_SECRET = process.env.JWT_SECRET || "novapay_jwt_secret_2024";

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Access token required",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired",
      });
    }
    return res.status(403).json({
      success: false,
      error: "Invalid token",
    });
  }
};

const authenticateService = (req, res, next) => {
  const serviceKey = req.headers["x-service-key"];
  const expectedKey = process.env.SERVICE_KEY || "7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH";

  if (!serviceKey || serviceKey !== expectedKey) {
    return res.status(403).json({
      success: false,
      error: "Invalid service key",
    });
  }

  next();
};

module.exports = { authenticateToken, authenticateService };

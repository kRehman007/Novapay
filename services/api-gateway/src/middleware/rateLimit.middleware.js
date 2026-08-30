const rateLimit = require("express-rate-limit");

const createRateLimiter = (windowMs, maxRequests) => {
  return rateLimit({
    windowMs: windowMs || 60000,
    max: maxRequests || 100,
    message: {
      success: false,
      error: "Too many requests, please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

module.exports = { createRateLimiter };

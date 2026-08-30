require("dotenv").config();
const app = require("./app");
const { connectDatabase } = require("./config/database");
const { connectRedis } = require("./config/redis");
const { createLogger } = require("./utils/logger");

const logger = createLogger({ component: "server" });
const PORT = process.env.PORT || 4001;

const startServer = async () => {
  try {
    await connectDatabase();
    connectRedis();

    app.listen(PORT, () => {
      logger.info(`Account Service running on port ${PORT}`);
      console.log(`Account Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server", { error: error.message });
    process.exit(1);
  }
};

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled rejection", { error: err.message });
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: err.message });
  process.exit(1);
});

startServer();

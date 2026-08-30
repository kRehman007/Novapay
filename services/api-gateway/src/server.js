require("dotenv").config();

const app = require("./app");
const { createLogger } = require("./utils/logger");

const logger = createLogger({ component: "server" });
const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      logger.info(`API Gateway running on port ${PORT}`);
      console.log(`API Gateway running on port ${PORT}`);
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

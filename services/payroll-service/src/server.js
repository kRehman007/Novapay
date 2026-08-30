require("dotenv").config();

const app = require("./app");
const { connectDatabase } = require("./config/database");
const payrollService = require("./services/payroll.services");

const PORT = process.env.PORT || 4005;

async function startServer() {
  try {
    await connectDatabase();

    try {
      await payrollService.initializeQueue();
    } catch (error) {
      console.warn("Queue initialization failed (Redis may be unavailable):", error.message);
    }

    try {
      await payrollService.recoverBatches();
    } catch (error) {
      console.warn("Batch recovery failed:", error.message);
    }

    app.listen(PORT, () => {
      console.log(`Payroll Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Payroll Service:", error);
    process.exit(1);
  }
}

startServer();

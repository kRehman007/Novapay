require("dotenv").config();

const app = require("./app");
const { connectDatabase } = require("./config/database");

const PORT = process.env.PORT || 4003;

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`Ledger Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Ledger Service:", error);
    process.exit(1);
  }
}

startServer();
require("dotenv").config();

const app = require("./app");
const { connectDatabase } = require("./config/database");

const PORT = process.env.PORT || 4006;

async function startServer() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Admin Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Admin Service:", error);
    process.exit(1);
  }
}

startServer();

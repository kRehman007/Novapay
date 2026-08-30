const mongoose = require("mongoose");

const mongoUri = process.env.MONGODB_URI;

async function connectDatabase() {
  try {
    await mongoose.connect(mongoUri);

    console.log(
      `Connected to MongoDB database: ${mongoose.connection.name}`
    );
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

function getDatabase() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Database is not connected");
  }

  return mongoose.connection;
}

module.exports = {
  connectDatabase,
  getDatabase,
};
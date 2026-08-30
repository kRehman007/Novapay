const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");

const ledgerRoutes = require("./routes/ledger.routes");
const { errorHandler, notFound } = require("./middleware/error.middleware");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "ledger-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/ledger", ledgerRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

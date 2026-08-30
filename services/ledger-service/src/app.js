const express = require("express");
const cors = require("cors");

const ledgerRoutes = require("./routes/ledger.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "ledger-service",
    status: "healthy"
  });
});

app.use("/ledger", ledgerRoutes);

module.exports = app;
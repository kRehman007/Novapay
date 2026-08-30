const express = require("express");
const ledgerController = require("../controllers/ledger.controller");
const { authenticateService } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/entries", authenticateService, ledgerController.createEntries);
router.get("/entries/:transactionId", authenticateService, ledgerController.getEntriesByTransaction);
router.get("/account/:accountId/entries", authenticateService, ledgerController.getEntriesByAccount);
router.get("/account/:accountId/balance", authenticateService, ledgerController.getBalance);
router.get("/transaction/:transactionId", authenticateService, ledgerController.getLedgerTransaction);
router.get("/transactions", authenticateService, ledgerController.getRecentTransactions);
router.get("/integrity", authenticateService, ledgerController.verifyIntegrity);
router.get("/audit-logs", authenticateService, ledgerController.getAuditLogs);

module.exports = router;

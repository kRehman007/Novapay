const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transaction.controller");
const { authenticateToken, authenticateService } = require("../middleware/auth.middleware");

// Protected routes (require user token)
router.post("/transfers/domestic", authenticateToken, transactionController.createTransfer);
router.post("/transfers/international", authenticateToken, transactionController.createFxTransfer);
router.get("/transfers/:id", authenticateToken, transactionController.getTransaction);
router.get("/transfers/user/:userId", authenticateToken, transactionController.getUserTransactions);
router.post("/transfers/:id/reverse", authenticateToken, transactionController.reverseTransaction);

// Service-to-service routes
router.get("/transfers/pending", authenticateService, transactionController.getPendingTransactions);
router.put("/transfers/:id/complete", authenticateService, transactionController.recoverTransaction);
router.put("/transfers/:id/failed", authenticateService, transactionController.recoverTransaction);
router.post("/transfers/recovery", authenticateService, transactionController.runRecovery);

module.exports = router;

const express = require("express");
const adminController = require("../controllers/admin.controller");
const { authenticateService } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/dashboard", authenticateService, adminController.getDashboard);

router.get("/transactions/search", authenticateService, adminController.searchTransactions);
router.get("/transactions/:transactionId", authenticateService, adminController.getTransactionDetail);
router.get("/transactions/:transactionId/audit", authenticateService, adminController.getAuditTrail);

router.post("/disputes", authenticateService, adminController.createDispute);
router.get("/disputes", authenticateService, adminController.getDisputes);
router.get("/disputes/:disputeId", authenticateService, adminController.getDispute);
router.put("/disputes/:disputeId", authenticateService, adminController.updateDispute);

router.post("/alerts", authenticateService, adminController.createAlert);
router.get("/alerts", authenticateService, adminController.getAlerts);
router.get("/alerts/:alertId", authenticateService, adminController.getAlert);
router.put("/alerts/:alertId/acknowledge", authenticateService, adminController.acknowledgeAlert);
router.put("/alerts/:alertId/resolve", authenticateService, adminController.resolveAlert);

router.post("/reports", authenticateService, adminController.generateReport);
router.get("/reports", authenticateService, adminController.getReports);
router.get("/reports/:reportId", authenticateService, adminController.getReport);

router.put("/accounts/:accountId/freeze", authenticateService, adminController.freezeAccount);
router.put("/accounts/:accountId/unfreeze", authenticateService, adminController.unfreezeAccount);

module.exports = router;

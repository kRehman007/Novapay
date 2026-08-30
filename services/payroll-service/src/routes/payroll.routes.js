const express = require("express");
const payrollController = require("../controllers/payroll.controller");
const { authenticateService } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/batches", authenticateService, payrollController.createBatch);
router.get("/batches", authenticateService, payrollController.getRecentBatches);
router.get("/batches/:batchId", authenticateService, payrollController.getBatch);
router.get("/batches/:batchId/items", authenticateService, payrollController.getBatchItems);
router.get("/batches/:batchId/stats", authenticateService, payrollController.getBatchStats);
router.post("/batches/:batchId/start", authenticateService, payrollController.startBatch);
router.post("/batches/:batchId/pause", authenticateService, payrollController.pauseBatch);
router.post("/batches/:batchId/resume", authenticateService, payrollController.resumeBatch);
router.post("/recovery", authenticateService, payrollController.recoverBatches);

module.exports = router;

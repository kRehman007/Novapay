const express = require("express");
const fxController = require("../controllers/fx.controller");
const { authenticateService } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/quote", authenticateService, fxController.createQuote);
router.get("/quote/:quoteId", authenticateService, fxController.getQuote);
router.get("/quote/:quoteId/validate", authenticateService, fxController.validateQuote);
router.put("/quote/:quoteId/use", authenticateService, fxController.markQuoteUsed);
router.get("/rate/:source/:target", authenticateService, fxController.getRate);
router.get("/quotes", authenticateService, fxController.getRecentQuotes);
router.get("/rates", authenticateService, fxController.getRecentRates);
router.get("/history/:source/:target", authenticateService, fxController.getQuoteHistory);

module.exports = router;

const express = require("express");
const router = express.Router();
const accountController = require("../controllers/account.controller");
const { authenticateToken, authenticateService } = require("../middleware/auth.middleware");

// Public routes
router.post("/accounts", accountController.createUser);
router.post("/accounts/auth", accountController.authenticateUser);

// Service-to-service routes
router.post(
  "/accounts/validate",
  authenticateService,
  accountController.validateWallets
);

// Protected routes (require user token)
router.get("/accounts/:userId", authenticateToken, accountController.getUser);
router.put("/accounts/:userId", authenticateToken, accountController.updateUser);
router.post("/accounts/:userId/wallets", authenticateToken, accountController.createWallet);
router.get("/accounts/:userId/wallets", authenticateToken, accountController.getWallets);
router.get("/accounts/:userId/balance", authenticateToken, accountController.getBalance);

// KYC routes
router.post("/accounts/:userId/kyc", authenticateToken, accountController.submitKyc);
router.get("/accounts/:userId/kyc", authenticateToken, accountController.getKycStatus);

// Admin routes (require admin role)
router.put("/accounts/:userId/freeze", authenticateToken, accountController.freezeAccount);
router.put("/accounts/:userId/unfreeze", authenticateToken, accountController.unfreezeAccount);

// Internal routes (service-to-service only)
router.get(
  "/internal/accounts/:userId",
  authenticateService,
  accountController.getUser
);
router.get(
  "/internal/accounts/:userId/balance",
  authenticateService,
  accountController.getBalance
);

module.exports = router;

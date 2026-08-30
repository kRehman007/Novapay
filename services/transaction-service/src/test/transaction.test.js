const transactionService = require("../services/transaction.services");
const { TransactionRepository, IdempotencyKeyRepository } = require("../repositories/transaction.repository");

process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only";
process.env.SERVICE_KEY = "test-service-key";

jest.mock("../repositories/transaction.repository");
jest.mock("../config/redis", () => ({
  getRedisClient: () => null,
}));
jest.mock("../utils/logger", () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
}));
jest.mock("axios");

describe("TransactionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getTransaction", () => {
    it("should return transaction by ID", async () => {
      TransactionRepository.prototype.findById.mockResolvedValue({
        transactionId: "txn_test123",
        status: "COMPLETED",
        amountMinor: 5000,
        currency: "USD",
      });

      const result = await transactionService.getTransaction("txn_test123");

      expect(result.transactionId).toBe("txn_test123");
      expect(result.status).toBe("COMPLETED");
    });

    it("should throw error if transaction not found", async () => {
      TransactionRepository.prototype.findById.mockResolvedValue(null);

      await expect(
        transactionService.getTransaction("txn_nonexistent")
      ).rejects.toThrow("Transaction not found");
    });
  });

  describe("getPendingTransactions", () => {
    it("should return pending transactions", async () => {
      TransactionRepository.prototype.findPendingOlderThan.mockResolvedValue([
        { transactionId: "txn_1", status: "PENDING" },
        { transactionId: "txn_2", status: "PROCESSING" },
      ]);

      const result = await transactionService.getPendingTransactions();

      expect(result).toHaveLength(2);
      expect(TransactionRepository.prototype.findPendingOlderThan).toHaveBeenCalledWith(5);
    });
  });

  describe("reverseTransaction", () => {
    it("should reverse a completed transaction", async () => {
      TransactionRepository.prototype.findById
        .mockResolvedValueOnce({
          transactionId: "txn_original",
          status: "COMPLETED",
          type: "TRANSFER",
          senderWalletId: "wal_sender",
          senderUserId: "usr_sender",
          receiverWalletId: "wal_receiver",
          receiverUserId: "usr_receiver",
          amountMinor: 5000,
          currency: "USD",
        })
        .mockResolvedValueOnce({
          transactionId: "txn_reversal",
          status: "COMPLETED",
        });

      TransactionRepository.prototype.create.mockResolvedValue({
        transactionId: "txn_reversal",
        status: "PROCESSING",
      });

      transactionService.createReversalLedgerEntries = jest.fn().mockResolvedValue({ transactionId: "txn_reversal" });
      transactionService.updateBalanceCache = jest.fn().mockResolvedValue();

      const result = await transactionService.reverseTransaction("txn_original", "Customer request");

      expect(result.status).toBe("COMPLETED");
      expect(result.originalTransactionId).toBe("txn_original");
    });

    it("should throw error if transaction not found", async () => {
      TransactionRepository.prototype.findById.mockReset();
      TransactionRepository.prototype.findById.mockResolvedValue(null);

      await expect(
        transactionService.reverseTransaction("txn_nonexistent", "reason")
      ).rejects.toThrow("Transaction not found");
    });

    it("should throw error if transaction not completed", async () => {
      TransactionRepository.prototype.findById.mockResolvedValue({
        transactionId: "txn_pending",
        status: "PENDING",
      });

      await expect(
        transactionService.reverseTransaction("txn_pending", "reason")
      ).rejects.toThrow("Only completed transactions can be reversed");
    });

    it("should throw error if trying to reverse a reversal", async () => {
      TransactionRepository.prototype.findById.mockResolvedValue({
        transactionId: "txn_reversal",
        status: "COMPLETED",
        type: "REVERSAL",
      });

      await expect(
        transactionService.reverseTransaction("txn_reversal", "reason")
      ).rejects.toThrow("Cannot reverse a reversal");
    });
  });

  describe("recoverTransaction", () => {
    it("should recover completed transaction", async () => {
      TransactionRepository.prototype.findById.mockResolvedValue({
        transactionId: "txn_123",
        status: "COMPLETED",
      });

      const result = await transactionService.recoverTransaction("txn_123");

      expect(result.status).toBe("COMPLETED");
      expect(result.message).toBe("Already completed");
    });

    it("should recover transaction with ledger entries", async () => {
      TransactionRepository.prototype.findById.mockResolvedValue({
        transactionId: "txn_123",
        status: "PENDING",
        idempotencyKey: "key_123",
      });

      transactionService.checkLedgerEntries = jest.fn().mockResolvedValue(true);

      const result = await transactionService.recoverTransaction("txn_123");

      expect(result.status).toBe("COMPLETED");
    });

    it("should mark as failed if no ledger entries", async () => {
      TransactionRepository.prototype.findById.mockResolvedValue({
        transactionId: "txn_123",
        status: "PENDING",
        idempotencyKey: "key_123",
      });

      transactionService.checkLedgerEntries = jest.fn().mockResolvedValue(false);

      const result = await transactionService.recoverTransaction("txn_123");

      expect(result.status).toBe("FAILED");
    });
  });
});

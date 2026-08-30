const ledgerService = require("../services/ledger.services");

jest.mock("../repositories/ledger.repository", () => {
  const mockEntries = [];
  return {
    LedgerAccountRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockResolvedValue({ accountId: "lac_test", status: "ACTIVE" }),
      findById: jest.fn().mockResolvedValue({ accountId: "lac_test", status: "ACTIVE" }),
      findByOwner: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn().mockResolvedValue({}),
    })),
    LedgerEntryRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockImplementation((data) => Promise.resolve({ ...data, entryId: "len_test", createdAt: new Date() })),
      createMany: jest.fn().mockImplementation((entries) =>
        Promise.resolve(entries.map((e, i) => ({ ...e, entryId: `len_${i}`, createdAt: new Date() })))
      ),
      findByTransactionId: jest.fn().mockResolvedValue([]),
      findByAccountId: jest.fn().mockResolvedValue([]),
      getBalanceByAccount: jest.fn().mockResolvedValue(10000),
      countByTransactionId: jest.fn().mockResolvedValue(2),
    })),
    LedgerTransactionRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({ ...data, transactionId: data.transactionId || "ltx_test123", createdAt: new Date() })
      ),
      findById: jest.fn().mockResolvedValue(null),
      findByReference: jest.fn().mockResolvedValue(null),
      updateStatus: jest.fn().mockResolvedValue({}),
      updateTotals: jest.fn().mockResolvedValue({}),
      findRecent: jest.fn().mockResolvedValue([]),
    })),
    AuditLogRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockImplementation((data) => Promise.resolve({ ...data, logId: "aud_test", timestamp: new Date() })),
      getLatest: jest.fn().mockResolvedValue(null),
      findByTransactionId: jest.fn().mockResolvedValue([]),
      findRecent: jest.fn().mockResolvedValue([]),
      verifyChainIntegrity: jest.fn().mockResolvedValue({ valid: true, totalLogs: 0 }),
    })),
  };
});

describe("LedgerService", () => {
  describe("createEntries", () => {
    it("should create balanced double-entry ledger entries", async () => {
      const result = await ledgerService.createEntries({
        transactionId: "txn_test123",
        type: "TRANSFER",
        entries: [
          { accountId: "wal_sender", entryType: "DEBIT", amountMinor: 10000, currency: "USD" },
          { accountId: "wal_receiver", entryType: "CREDIT", amountMinor: 10000, currency: "USD" },
        ],
      });

      expect(result).toBeDefined();
      expect(result.status).toBe("COMPLETED");
      expect(result.isInvariantBalanced).toBe(true);
      expect(result.totalDebitMinor).toBe(10000);
      expect(result.totalCreditMinor).toBe(10000);
    });

    it("should throw error if less than 2 entries", async () => {
      await expect(
        ledgerService.createEntries({
          transactionId: "txn_test",
          type: "TRANSFER",
          entries: [{ accountId: "wal_1", entryType: "DEBIT", amountMinor: 10000, currency: "USD" }],
        })
      ).rejects.toThrow("At least 2 entries required");
    });

    it("should throw error if debits != credits", async () => {
      await expect(
        ledgerService.createEntries({
          transactionId: "txn_test",
          type: "TRANSFER",
          entries: [
            { accountId: "wal_1", entryType: "DEBIT", amountMinor: 10000, currency: "USD" },
            { accountId: "wal_2", entryType: "CREDIT", amountMinor: 5000, currency: "USD" },
          ],
        })
      ).rejects.toThrow("Invariant check failed");
    });

    it("should create FX ledger entries with different amounts", async () => {
      const result = await ledgerService.createEntries({
        transactionId: "txn_fx123",
        type: "FX_TRANSFER",
        entries: [
          { accountId: "wal_usd", entryType: "DEBIT", amountMinor: 10000, currency: "USD", fxRate: 0.92 },
          { accountId: "wal_eur", entryType: "CREDIT", amountMinor: 9200, currency: "EUR", fxRate: 0.92 },
        ],
      });

      expect(result).toBeDefined();
      expect(result.status).toBe("COMPLETED");
      expect(result.totalDebitMinor).toBe(10000);
      expect(result.totalCreditMinor).toBe(9200);
    });
  });

  describe("getEntriesByTransactionId", () => {
    it("should return entries for a transaction", async () => {
      const entries = await ledgerService.getEntriesByTransactionId("txn_test123");
      expect(Array.isArray(entries)).toBe(true);
    });
  });

  describe("getBalance", () => {
    it("should return balance for an account", async () => {
      const balance = await ledgerService.getBalance("wal_123", "USD");
      expect(balance).toBeDefined();
      expect(balance.accountId).toBe("wal_123");
      expect(balance.currency).toBe("USD");
      expect(typeof balance.balance).toBe("number");
    });
  });

  describe("verifyAuditLogIntegrity", () => {
    it("should verify audit log chain integrity", async () => {
      const result = await ledgerService.verifyAuditLogIntegrity();
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });
  });
});

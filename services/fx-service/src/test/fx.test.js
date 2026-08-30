const fxService = require("../services/fx.services");

jest.mock("../repositories/fx.repository", () => {
  return {
    FxQuoteRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({ ...data, quoteId: "fxq_test123", createdAt: new Date() })
      ),
      findById: jest.fn().mockResolvedValue(null),
      findActive: jest.fn().mockResolvedValue(null),
      markUsed: jest.fn().mockImplementation((quoteId, transactionId) =>
        Promise.resolve({ quoteId, status: "USED", usedByTransactionId: transactionId })
      ),
      findRecent: jest.fn().mockResolvedValue([]),
      findByPair: jest.fn().mockResolvedValue([]),
    })),
    FxRateRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockImplementation((data) => Promise.resolve({ ...data, rateId: "fxr_test", createdAt: new Date() })),
      findLatest: jest.fn().mockResolvedValue(null),
      findByPair: jest.fn().mockResolvedValue([]),
      findRecent: jest.fn().mockResolvedValue([]),
    })),
  };
});

describe("FxService", () => {
  describe("createQuote", () => {
    it("should create an FX quote", async () => {
      const quote = await fxService.createQuote({
        sourceCurrency: "USD",
        targetCurrency: "EUR",
        sourceAmountMinor: 10000,
        userId: "usr_test",
      });

      expect(quote).toBeDefined();
      expect(quote.quoteId).toBe("fxq_test123");
      expect(quote.sourceCurrency).toBe("USD");
      expect(quote.targetCurrency).toBe("EUR");
      expect(quote.sourceAmountMinor).toBe(10000);
      expect(quote.rate).toBeGreaterThan(0);
      expect(quote.status).toBe("ACTIVE");
    });

    it("should throw error for same currencies", async () => {
      await expect(
        fxService.createQuote({
          sourceCurrency: "USD",
          targetCurrency: "USD",
          sourceAmountMinor: 10000,
        })
      ).rejects.toThrow("Source and target currencies must be different");
    });

    it("should throw error for invalid amount", async () => {
      await expect(
        fxService.createQuote({
          sourceCurrency: "USD",
          targetCurrency: "EUR",
          sourceAmountMinor: 0,
        })
      ).rejects.toThrow("sourceAmountMinor must be at least 1");
    });
  });

  describe("getRate", () => {
    it("should return a rate for valid currency pair", async () => {
      const rate = await fxService.getRate("USD", "EUR");
      expect(rate).toBeDefined();
      expect(rate.pair).toBe("USDEUR");
      expect(rate.rate).toBeGreaterThan(0);
      expect(rate.sourceCurrency).toBe("USD");
      expect(rate.targetCurrency).toBe("EUR");
    });

    it("should handle inverse rates", async () => {
      const rate = await fxService.getRate("EUR", "USD");
      expect(rate).toBeDefined();
      expect(rate.pair).toBe("EURUSD");
      expect(rate.rate).toBeGreaterThan(0);
    });
  });

  describe("getBaseRate", () => {
    it("should return known rates", () => {
      expect(fxService.getBaseRate("USD", "EUR")).toBe(0.92);
      expect(fxService.getBaseRate("USD", "GBP")).toBe(0.79);
      expect(fxService.getBaseRate("USD", "PKR")).toBe(280.5);
    });

    it("should return inverse rate for unknown pair", () => {
      const rate = fxService.getBaseRate("EUR", "GBP");
      expect(rate).toBeGreaterThan(0);
    });
  });
});

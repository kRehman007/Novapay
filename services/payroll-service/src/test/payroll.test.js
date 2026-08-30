jest.mock("../config/redis", () => ({
  getRedisClient: jest.fn().mockReturnValue(null),
  closeRedis: jest.fn(),
}));

jest.mock("../repositories/payroll.repository", () => {
  return {
    PayrollBatchRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({ ...data, batchId: data.batchId || "bat_test123", createdAt: new Date() })
      ),
      findById: jest.fn().mockResolvedValue(null),
      findByEmployer: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn().mockResolvedValue({}),
      incrementProgress: jest.fn().mockResolvedValue({}),
      updateLastProcessedIndex: jest.fn().mockResolvedValue({}),
      findPendingOrProcessing: jest.fn().mockResolvedValue([]),
    })),
    PayrollItemRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockImplementation((data) => Promise.resolve({ ...data, itemId: "pay_test" })),
      createMany: jest.fn().mockImplementation((items) =>
        Promise.resolve(items.map((item, i) => ({ ...item, itemId: `pay_${i}` })))
      ),
      findById: jest.fn().mockResolvedValue(null),
      findByBatchId: jest.fn().mockResolvedValue([]),
      findPendingByBatchId: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn().mockResolvedValue({}),
      countByBatchAndStatus: jest.fn().mockResolvedValue(0),
      getBatchStats: jest.fn().mockResolvedValue({ PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0, totalAmount: 0 }),
    })),
  };
});

const payrollService = require("../services/payroll.services");

describe("PayrollService", () => {
  describe("createBatch", () => {
    it("should create a payroll batch", async () => {
      const result = await payrollService.createBatch({
        employerId: "usr_employer",
        employerWalletId: "wal_employer",
        name: "August Salaries",
        currency: "PKR",
        items: [
          { employeeId: "usr_emp1", employeeWalletId: "wal_emp1", amountMinor: 50000 },
          { employeeId: "usr_emp2", employeeWalletId: "wal_emp2", amountMinor: 60000 },
        ],
        idempotencyKey: "iky_test",
      });

      expect(result).toBeDefined();
      expect(result.batchId).toBe("bat_test123");
      expect(result.totalItems).toBe(2);
      expect(result.totalAmountMinor).toBe(110000);
    });

    it("should throw error for empty items", async () => {
      await expect(
        payrollService.createBatch({
          employerId: "usr_employer",
          employerWalletId: "wal_employer",
          name: "Test",
          currency: "PKR",
          items: [],
          idempotencyKey: "iky_test",
        })
      ).rejects.toThrow("At least one item required");
    });
  });

  describe("getBatch", () => {
    it("should throw error for non-existent batch", async () => {
      await expect(payrollService.getBatch("bat_nonexistent")).rejects.toThrow("Batch not found");
    });
  });

  describe("startBatch", () => {
    it("should throw error for non-existent batch", async () => {
      await expect(payrollService.startBatch("bat_nonexistent")).rejects.toThrow("Batch not found");
    });
  });

  describe("pauseBatch", () => {
    it("should throw error for non-existent batch", async () => {
      await expect(payrollService.pauseBatch("bat_nonexistent")).rejects.toThrow("Batch not found");
    });
  });

  describe("resumeBatch", () => {
    it("should throw error for non-existent batch", async () => {
      await expect(payrollService.resumeBatch("bat_nonexistent")).rejects.toThrow("Batch not found");
    });
  });
});

jest.mock("../repositories/admin.repository", () => {
  return {
    DisputeRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({ ...data, disputeId: "dsp_test123", createdAt: new Date() })
      ),
      findById: jest.fn().mockResolvedValue(null),
      findByTransactionId: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
    })),
    AlertRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({ ...data, alertId: "alt_test123", createdAt: new Date() })
      ),
      findById: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
      countBySeverity: jest.fn().mockResolvedValue({ CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }),
    })),
    ReportRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({ ...data, reportId: "rpt_test123", createdAt: new Date() })
      ),
      findById: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn().mockResolvedValue({}),
    })),
  };
});

const adminService = require("../services/admin.services");

describe("AdminService", () => {
  describe("getDashboard", () => {
    it("should return dashboard stats", async () => {
      const dashboard = await adminService.getDashboard();
      expect(dashboard).toBeDefined();
      expect(dashboard.disputes).toBeDefined();
      expect(dashboard.alerts).toBeDefined();
      expect(dashboard.timestamp).toBeDefined();
    });
  });

  describe("createDispute", () => {
    it("should create a dispute", async () => {
      const dispute = await adminService.createDispute({
        transactionId: "txn_test",
        userId: "usr_test",
        type: "DUPLICATE_CHARGE",
        description: "Charged twice",
      });

      expect(dispute).toBeDefined();
      expect(dispute.disputeId).toBe("dsp_test123");
      expect(dispute.status).toBe("OPEN");
    });
  });

  describe("getDispute", () => {
    it("should throw error for non-existent dispute", async () => {
      await expect(adminService.getDispute("dsp_nonexistent")).rejects.toThrow("Dispute not found");
    });
  });

  describe("createAlert", () => {
    it("should create an alert", async () => {
      const alert = await adminService.createAlert({
        type: "INVARIANT_VIOLATION",
        severity: "CRITICAL",
        message: "Debit != Credit",
      });

      expect(alert).toBeDefined();
      expect(alert.alertId).toBe("alt_test123");
      expect(alert.status).toBe("ACTIVE");
    });
  });

  describe("getAlert", () => {
    it("should throw error for non-existent alert", async () => {
      await expect(adminService.getAlert("alt_nonexistent")).rejects.toThrow("Alert not found");
    });
  });

  describe("generateReport", () => {
    it("should generate a report", async () => {
      const report = await adminService.generateReport({
        type: "DAILY_SUMMARY",
        generatedBy: "admin",
      });

      expect(report).toBeDefined();
      expect(report.reportId).toBe("rpt_test123");
      expect(report.status).toBe("COMPLETED");
    });
  });

  describe("getReport", () => {
    it("should throw error for non-existent report", async () => {
      await expect(adminService.getReport("rpt_nonexistent")).rejects.toThrow("Report not found");
    });
  });
});

const { DisputeRepository, AlertRepository, ReportRepository } = require("../repositories/admin.repository");
const { createLogger } = require("../utils/logger");
const axios = require("axios");

const logger = createLogger({ component: "admin-service" });

const ACCOUNT_SERVICE_URL = process.env.ACCOUNT_SERVICE_URL || "http://localhost:4001";
const TRANSACTION_SERVICE_URL = process.env.TRANSACTION_SERVICE_URL || "http://localhost:4002";
const LEDGER_SERVICE_URL = process.env.LEDGER_SERVICE_URL || "http://localhost:4003";
const FX_SERVICE_URL = process.env.FX_SERVICE_URL || "http://localhost:4004";
const PAYROLL_SERVICE_URL = process.env.PAYROLL_SERVICE_URL || "http://localhost:4005";
const SERVICE_KEY = process.env.SERVICE_KEY;

class AdminService {
  constructor() {
    this.disputeRepo = new DisputeRepository();
    this.alertRepo = new AlertRepository();
    this.reportRepo = new ReportRepository();
  }

  async getDashboard() {
    try {
      const [disputeStats, alertStats] = await Promise.all([
        this.getDisputeStats(),
        this.getAlertStats(),
      ]);

      return {
        disputes: disputeStats,
        alerts: alertStats,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error("Failed to get dashboard", { error: error.message });
      throw error;
    }
  }

  async getDisputeStats() {
    const open = await this.disputeRepo.count({ status: "OPEN" });
    const investigating = await this.disputeRepo.count({ status: "INVESTIGATING" });
    const resolved = await this.disputeRepo.count({ status: "RESOLVED" });
    const rejected = await this.disputeRepo.count({ status: "REJECTED" });
    const total = open + investigating + resolved + rejected;

    return { total, open, investigating, resolved, rejected };
  }

  async getAlertStats() {
    const active = await this.alertRepo.count({ status: "ACTIVE" });
    const acknowledged = await this.alertRepo.count({ status: "ACKNOWLEDGED" });
    const resolved = await this.alertRepo.count({ status: "RESOLVED" });
    const bySeverity = await this.alertRepo.countBySeverity();

    return { active, acknowledged, resolved, bySeverity };
  }

  async searchTransactions(query) {
    try {
      const response = await axios.get(
        `${TRANSACTION_SERVICE_URL}/api/transfers/user/${query.userId}`,
        {
          headers: { "X-Service-Key": SERVICE_KEY },
          params: { limit: query.limit || 50 },
        }
      );
      return response.data.data;
    } catch (error) {
      logger.error("Failed to search transactions", { error: error.message });
      return [];
    }
  }

  async getTransactionDetail(transactionId) {
    try {
      const response = await axios.get(
        `${TRANSACTION_SERVICE_URL}/api/transfers/${transactionId}`,
        { headers: { "X-Service-Key": SERVICE_KEY } }
      );
      return response.data.data;
    } catch (error) {
      logger.error("Failed to get transaction detail", { error: error.message });
      return null;
    }
  }

  async getAuditTrail(transactionId) {
    try {
      const response = await axios.get(
        `${LEDGER_SERVICE_URL}/api/ledger/audit-logs`,
        {
          headers: { "X-Service-Key": SERVICE_KEY },
          params: { transactionId },
        }
      );
      return response.data.data;
    } catch (error) {
      logger.error("Failed to get audit trail", { error: error.message });
      return [];
    }
  }

  async createDispute({ transactionId, userId, type, description }) {
    const existing = await this.disputeRepo.findByTransactionId(transactionId);
    if (existing) {
      const error = new Error("Dispute already exists for this transaction");
      error.statusCode = 409;
      throw error;
    }

    const dispute = await this.disputeRepo.create({
      transactionId,
      userId,
      type,
      description,
      status: "OPEN",
    });

    logger.info("Dispute created", { disputeId: dispute.disputeId, transactionId });
    return dispute;
  }

  async getDispute(disputeId) {
    const dispute = await this.disputeRepo.findById(disputeId);
    if (!dispute) {
      const error = new Error("Dispute not found");
      error.statusCode = 404;
      throw error;
    }
    return dispute;
  }

  async updateDispute(disputeId, { status, resolution, assignedTo }) {
    const dispute = await this.disputeRepo.findById(disputeId);
    if (!dispute) {
      const error = new Error("Dispute not found");
      error.statusCode = 404;
      throw error;
    }

    const updates = {};
    if (resolution) updates.resolution = resolution;
    if (assignedTo) updates.assignedTo = assignedTo;
    if (status === "RESOLVED" || status === "REJECTED") {
      updates.resolvedAt = new Date();
    }

    const updated = await this.disputeRepo.updateStatus(disputeId, status, updates);

    logger.info("Dispute updated", { disputeId, status });
    return updated;
  }

  async getDisputes(filters = {}, options = {}) {
    return await this.disputeRepo.find(filters, options);
  }

  async createAlert({ type, severity, message, details, transactionId }) {
    const alert = await this.alertRepo.create({
      type,
      severity,
      message,
      details: details || {},
      transactionId: transactionId || null,
      status: "ACTIVE",
    });

    logger.info("Alert created", { alertId: alert.alertId, type, severity });
    return alert;
  }

  async getAlert(alertId) {
    const alert = await this.alertRepo.findById(alertId);
    if (!alert) {
      const error = new Error("Alert not found");
      error.statusCode = 404;
      throw error;
    }
    return alert;
  }

  async acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = await this.alertRepo.findById(alertId);
    if (!alert) {
      const error = new Error("Alert not found");
      error.statusCode = 404;
      throw error;
    }

    const updated = await this.alertRepo.updateStatus(alertId, "ACKNOWLEDGED", {
      acknowledgedBy,
      acknowledgedAt: new Date(),
    });

    logger.info("Alert acknowledged", { alertId, acknowledgedBy });
    return updated;
  }

  async resolveAlert(alertId, resolvedBy) {
    const alert = await this.alertRepo.findById(alertId);
    if (!alert) {
      const error = new Error("Alert not found");
      error.statusCode = 404;
      throw error;
    }

    const updated = await this.alertRepo.updateStatus(alertId, "RESOLVED", {
      resolvedBy,
      resolvedAt: new Date(),
    });

    logger.info("Alert resolved", { alertId, resolvedBy });
    return updated;
  }

  async getAlerts(filters = {}, options = {}) {
    return await this.alertRepo.find(filters, options);
  }

  async generateReport({ type, generatedBy, parameters }) {
    const report = await this.reportRepo.create({
      type,
      generatedBy,
      parameters: parameters || {},
      status: "COMPLETED",
      completedAt: new Date(),
    });

    logger.info("Report generated", { reportId: report.reportId, type });
    return report;
  }

  async getReport(reportId) {
    const report = await this.reportRepo.findById(reportId);
    if (!report) {
      const error = new Error("Report not found");
      error.statusCode = 404;
      throw error;
    }
    return report;
  }

  async getReports(filters = {}, options = {}) {
    return await this.reportRepo.find(filters, options);
  }

  async freezeAccount(accountId, reason) {
    try {
      await axios.put(
        `${ACCOUNT_SERVICE_URL}/api/accounts/${accountId}/status`,
        { status: "FROZEN", reason },
        { headers: { "X-Service-Key": SERVICE_KEY } }
      );

      logger.info("Account frozen", { accountId, reason });
      return { accountId, status: "FROZEN", reason };
    } catch (error) {
      logger.error("Failed to freeze account", { accountId, error: error.message });
      throw error;
    }
  }

  async unfreezeAccount(accountId) {
    try {
      await axios.put(
        `${ACCOUNT_SERVICE_URL}/api/accounts/${accountId}/status`,
        { status: "ACTIVE" },
        { headers: { "X-Service-Key": SERVICE_KEY } }
      );

      logger.info("Account unfrozen", { accountId });
      return { accountId, status: "ACTIVE" };
    } catch (error) {
      logger.error("Failed to unfreeze account", { accountId, error: error.message });
      throw error;
    }
  }
}

module.exports = new AdminService();

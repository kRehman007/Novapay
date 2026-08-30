const adminService = require("../services/admin.services");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "admin-controller" });

class AdminController {
  async getDashboard(req, res, next) {
    try {
      const dashboard = await adminService.getDashboard();
      res.json({ success: true, data: dashboard });
    } catch (error) {
      next(error);
    }
  }

  async searchTransactions(req, res, next) {
    try {
      const { userId, limit } = req.query;
      if (!userId) {
        return res.status(400).json({ success: false, error: "userId is required" });
      }
      const transactions = await adminService.searchTransactions({ userId, limit: limit ? parseInt(limit) : 50 });
      res.json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  }

  async getTransactionDetail(req, res, next) {
    try {
      const { transactionId } = req.params;
      const transaction = await adminService.getTransactionDetail(transactionId);
      if (!transaction) {
        return res.status(404).json({ success: false, error: "Transaction not found" });
      }
      res.json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }

  async getAuditTrail(req, res, next) {
    try {
      const { transactionId } = req.params;
      const trail = await adminService.getAuditTrail(transactionId);
      res.json({ success: true, data: trail });
    } catch (error) {
      next(error);
    }
  }

  async createDispute(req, res, next) {
    try {
      const { transactionId, userId, type, description } = req.body;

      if (!transactionId) {
        return res.status(400).json({ success: false, error: "transactionId is required" });
      }
      if (!userId) {
        return res.status(400).json({ success: false, error: "userId is required" });
      }
      if (!type) {
        return res.status(400).json({ success: false, error: "type is required" });
      }
      if (!description) {
        return res.status(400).json({ success: false, error: "description is required" });
      }

      const dispute = await adminService.createDispute({ transactionId, userId, type, description });
      res.status(201).json({ success: true, data: dispute });
    } catch (error) {
      next(error);
    }
  }

  async getDispute(req, res, next) {
    try {
      const { disputeId } = req.params;
      const dispute = await adminService.getDispute(disputeId);
      res.json({ success: true, data: dispute });
    } catch (error) {
      next(error);
    }
  }

  async updateDispute(req, res, next) {
    try {
      const { disputeId } = req.params;
      const { status, resolution, assignedTo } = req.body;
      const dispute = await adminService.updateDispute(disputeId, { status, resolution, assignedTo });
      res.json({ success: true, data: dispute });
    } catch (error) {
      next(error);
    }
  }

  async getDisputes(req, res, next) {
    try {
      const { status, userId, type, limit, skip } = req.query;
      const disputes = await adminService.getDisputes(
        { status, userId, type },
        { limit: limit ? parseInt(limit) : 50, skip: skip ? parseInt(skip) : 0 }
      );
      res.json({ success: true, data: disputes });
    } catch (error) {
      next(error);
    }
  }

  async createAlert(req, res, next) {
    try {
      const { type, severity, message, details, transactionId } = req.body;

      if (!type) {
        return res.status(400).json({ success: false, error: "type is required" });
      }
      if (!severity) {
        return res.status(400).json({ success: false, error: "severity is required" });
      }
      if (!message) {
        return res.status(400).json({ success: false, error: "message is required" });
      }

      const alert = await adminService.createAlert({ type, severity, message, details, transactionId });
      res.status(201).json({ success: true, data: alert });
    } catch (error) {
      next(error);
    }
  }

  async getAlert(req, res, next) {
    try {
      const { alertId } = req.params;
      const alert = await adminService.getAlert(alertId);
      res.json({ success: true, data: alert });
    } catch (error) {
      next(error);
    }
  }

  async acknowledgeAlert(req, res, next) {
    try {
      const { alertId } = req.params;
      const { acknowledgedBy } = req.body;
      const alert = await adminService.acknowledgeAlert(alertId, acknowledgedBy || "admin");
      res.json({ success: true, data: alert });
    } catch (error) {
      next(error);
    }
  }

  async resolveAlert(req, res, next) {
    try {
      const { alertId } = req.params;
      const { resolvedBy } = req.body;
      const alert = await adminService.resolveAlert(alertId, resolvedBy || "admin");
      res.json({ success: true, data: alert });
    } catch (error) {
      next(error);
    }
  }

  async getAlerts(req, res, next) {
    try {
      const { status, type, severity, limit, skip } = req.query;
      const alerts = await adminService.getAlerts(
        { status, type, severity },
        { limit: limit ? parseInt(limit) : 50, skip: skip ? parseInt(skip) : 0 }
      );
      res.json({ success: true, data: alerts });
    } catch (error) {
      next(error);
    }
  }

  async generateReport(req, res, next) {
    try {
      const { type, generatedBy, parameters } = req.body;

      if (!type) {
        return res.status(400).json({ success: false, error: "type is required" });
      }
      if (!generatedBy) {
        return res.status(400).json({ success: false, error: "generatedBy is required" });
      }

      const report = await adminService.generateReport({ type, generatedBy, parameters });
      res.status(201).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  async getReport(req, res, next) {
    try {
      const { reportId } = req.params;
      const report = await adminService.getReport(reportId);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  async getReports(req, res, next) {
    try {
      const { type, generatedBy, limit, skip } = req.query;
      const reports = await adminService.getReports(
        { type, generatedBy },
        { limit: limit ? parseInt(limit) : 50, skip: skip ? parseInt(skip) : 0 }
      );
      res.json({ success: true, data: reports });
    } catch (error) {
      next(error);
    }
  }

  async freezeAccount(req, res, next) {
    try {
      const { accountId } = req.params;
      const { reason } = req.body;
      const result = await adminService.freezeAccount(accountId, reason || "Admin action");
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async unfreezeAccount(req, res, next) {
    try {
      const { accountId } = req.params;
      const result = await adminService.unfreezeAccount(accountId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();

const payrollService = require("../services/payroll.services");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "payroll-controller" });

class PayrollController {
  async createBatch(req, res, next) {
    try {
      const { employerId, employerWalletId, name, currency, items, idempotencyKey } = req.body;

      if (!employerId) {
        return res.status(400).json({ success: false, error: "employerId is required" });
      }

      if (!employerWalletId) {
        return res.status(400).json({ success: false, error: "employerWalletId is required" });
      }

      if (!name) {
        return res.status(400).json({ success: false, error: "name is required" });
      }

      if (!currency) {
        return res.status(400).json({ success: false, error: "currency is required" });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: "items array is required" });
      }

      const result = await payrollService.createBatch({
        employerId,
        employerWalletId,
        name,
        currency,
        items,
        idempotencyKey,
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getBatch(req, res, next) {
    try {
      const { batchId } = req.params;
      const batch = await payrollService.getBatch(batchId);
      res.json({ success: true, data: batch });
    } catch (error) {
      next(error);
    }
  }

  async getBatchItems(req, res, next) {
    try {
      const { batchId } = req.params;
      const { status, limit, skip } = req.query;

      const items = await payrollService.getBatchItems(batchId, {
        status,
        limit: limit ? parseInt(limit) : 1000,
        skip: skip ? parseInt(skip) : 0,
      });

      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  async getBatchStats(req, res, next) {
    try {
      const { batchId } = req.params;
      const stats = await payrollService.getBatchStats(batchId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async startBatch(req, res, next) {
    try {
      const { batchId } = req.params;
      const result = await payrollService.startBatch(batchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async pauseBatch(req, res, next) {
    try {
      const { batchId } = req.params;
      const result = await payrollService.pauseBatch(batchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async resumeBatch(req, res, next) {
    try {
      const { batchId } = req.params;
      const result = await payrollService.resumeBatch(batchId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async recoverBatches(req, res, next) {
    try {
      const result = await payrollService.recoverBatches();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getRecentBatches(req, res, next) {
    try {
      const { limit } = req.query;
      const batches = await payrollService.getRecentBatches(limit ? parseInt(limit) : 50);
      res.json({ success: true, data: batches });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PayrollController();

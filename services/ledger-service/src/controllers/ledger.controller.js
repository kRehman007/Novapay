const ledgerService = require("../services/ledger.services");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "ledger-controller" });

class LedgerController {
  async createEntries(req, res, next) {
    try {
      const { transactionId, type, entries, description, metadata, reference } = req.body;

      if (!transactionId) {
        return res.status(400).json({ success: false, error: "transactionId is required" });
      }

      if (!type) {
        return res.status(400).json({ success: false, error: "type is required" });
      }

      if (!entries || !Array.isArray(entries) || entries.length < 2) {
        return res.status(400).json({ success: false, error: "At least 2 entries required" });
      }

      const result = await ledgerService.createEntries({
        transactionId,
        type,
        entries,
        description,
        metadata,
        reference,
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getEntriesByTransaction(req, res, next) {
    try {
      const { transactionId } = req.params;
      const entries = await ledgerService.getEntriesByTransactionId(transactionId);
      res.json({ success: true, data: entries });
    } catch (error) {
      next(error);
    }
  }

  async getEntriesByAccount(req, res, next) {
    try {
      const { accountId } = req.params;
      const { currency, limit, skip } = req.query;

      const entries = await ledgerService.getEntriesByAccountId(accountId, {
        currency,
        limit: limit ? parseInt(limit) : 100,
        skip: skip ? parseInt(skip) : 0,
      });

      res.json({ success: true, data: entries });
    } catch (error) {
      next(error);
    }
  }

  async getBalance(req, res, next) {
    try {
      const { accountId } = req.params;
      const { currency } = req.query;

      if (!currency) {
        return res.status(400).json({ success: false, error: "currency query param required" });
      }

      const balance = await ledgerService.getBalance(accountId, currency);
      res.json({ success: true, data: balance });
    } catch (error) {
      next(error);
    }
  }

  async getLedgerTransaction(req, res, next) {
    try {
      const { transactionId } = req.params;
      const ledgerTx = await ledgerService.getLedgerTransaction(transactionId);

      if (!ledgerTx) {
        return res.status(404).json({ success: false, error: "Ledger transaction not found" });
      }

      res.json({ success: true, data: ledgerTx });
    } catch (error) {
      next(error);
    }
  }

  async getRecentTransactions(req, res, next) {
    try {
      const { limit } = req.query;
      const transactions = await ledgerService.getRecentTransactions(limit ? parseInt(limit) : 50);
      res.json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  }

  async verifyIntegrity(req, res, next) {
    try {
      const result = await ledgerService.verifyAuditLogIntegrity();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogs(req, res, next) {
    try {
      const { transactionId } = req.query;
      const logs = await ledgerService.getAuditLogs(transactionId);
      res.json({ success: true, data: logs });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LedgerController();

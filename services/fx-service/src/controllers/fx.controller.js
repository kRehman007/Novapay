const fxService = require("../services/fx.services");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "fx-controller" });

class FxController {
  async createQuote(req, res, next) {
    try {
      const { sourceCurrency, targetCurrency, sourceAmountMinor, userId } = req.body;

      if (!sourceCurrency) {
        return res.status(400).json({ success: false, error: "sourceCurrency is required" });
      }

      if (!targetCurrency) {
        return res.status(400).json({ success: false, error: "targetCurrency is required" });
      }

      if (!sourceAmountMinor) {
        return res.status(400).json({ success: false, error: "sourceAmountMinor is required" });
      }

      const quote = await fxService.createQuote({
        sourceCurrency,
        targetCurrency,
        sourceAmountMinor,
        userId,
      });

      res.status(201).json({ success: true, data: quote });
    } catch (error) {
      next(error);
    }
  }

  async getQuote(req, res, next) {
    try {
      const { quoteId } = req.params;
      const quote = await fxService.getQuote(quoteId);
      res.json({ success: true, data: quote });
    } catch (error) {
      next(error);
    }
  }

  async validateQuote(req, res, next) {
    try {
      const { quoteId } = req.params;
      const quote = await fxService.validateQuote(quoteId);
      res.json({ success: true, data: quote });
    } catch (error) {
      next(error);
    }
  }

  async markQuoteUsed(req, res, next) {
    try {
      const { quoteId } = req.params;
      const { transactionId } = req.body;

      if (!transactionId) {
        return res.status(400).json({ success: false, error: "transactionId is required" });
      }

      const quote = await fxService.markQuoteUsed(quoteId, transactionId);
      res.json({ success: true, data: quote });
    } catch (error) {
      next(error);
    }
  }

  async getRate(req, res, next) {
    try {
      const { source, target } = req.params;

      if (!source || !target) {
        return res.status(400).json({ success: false, error: "source and target currencies required" });
      }

      const rate = await fxService.getRate(source, target);
      res.json({ success: true, data: rate });
    } catch (error) {
      next(error);
    }
  }

  async getRecentQuotes(req, res, next) {
    try {
      const { limit } = req.query;
      const quotes = await fxService.getRecentQuotes(limit ? parseInt(limit) : 50);
      res.json({ success: true, data: quotes });
    } catch (error) {
      next(error);
    }
  }

  async getRecentRates(req, res, next) {
    try {
      const { limit } = req.query;
      const rates = await fxService.getRecentRates(limit ? parseInt(limit) : 50);
      res.json({ success: true, data: rates });
    } catch (error) {
      next(error);
    }
  }

  async getQuoteHistory(req, res, next) {
    try {
      const { source, target } = req.params;
      const { limit } = req.query;

      const history = await fxService.getQuoteHistory(source, target, limit ? parseInt(limit) : 10);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FxController();

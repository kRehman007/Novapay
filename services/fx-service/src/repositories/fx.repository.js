const FxQuote = require("../models/fxQuote.model");
const FxRate = require("../models/fxRate.model");
const { generateQuoteId, generateRateId } = require("../utils/idGenerator");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "fx-repository" });

class FxQuoteRepository {
  async create(quoteData) {
    const quoteId = quoteData.quoteId || generateQuoteId();
    const quote = new FxQuote({ ...quoteData, quoteId });
    return await quote.save();
  }

  async findById(quoteId) {
    return await FxQuote.findOne({ quoteId });
  }

  async findActive(quoteId) {
    return await FxQuote.findOne({ quoteId, status: "ACTIVE" });
  }

  async markUsed(quoteId, transactionId) {
    return await FxQuote.findOneAndUpdate(
      { quoteId, status: "ACTIVE" },
      { status: "USED", usedByTransactionId: transactionId },
      { returnDocument: "after" }
    );
  }

  async findRecent(limit = 50) {
    return await FxQuote.find().sort({ createdAt: -1 }).limit(limit);
  }

  async findByPair(sourceCurrency, targetCurrency, limit = 10) {
    return await FxQuote.find({ sourceCurrency, targetCurrency })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

class FxRateRepository {
  async create(rateData) {
    const rateId = rateData.rateId || generateRateId();
    const rate = new FxRate({ ...rateData, rateId });
    return await rate.save();
  }

  async findLatest(pair) {
    return await FxRate.findOne({ pair }).sort({ fetchedAt: -1 });
  }

  async findByPair(pair, limit = 10) {
    return await FxRate.find({ pair }).sort({ fetchedAt: -1 }).limit(limit);
  }

  async findRecent(limit = 50) {
    return await FxRate.find().sort({ fetchedAt: -1 }).limit(limit);
  }
}

module.exports = { FxQuoteRepository, FxRateRepository };

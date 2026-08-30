const { FxQuoteRepository, FxRateRepository } = require("../repositories/fx.repository");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "fx-service" });

const QUOTE_TTL_SECONDS = parseInt(process.env.FX_QUOTE_TTL_SECONDS) || 60;
const RATE_CACHE_TTL_SECONDS = parseInt(process.env.FX_RATE_CACHE_TTL_SECONDS) || 300;

class FxService {
  constructor() {
    this.quoteRepo = new FxQuoteRepository();
    this.rateRepo = new FxRateRepository();
  }

  async createQuote({ sourceCurrency, targetCurrency, sourceAmountMinor, userId }) {
    sourceCurrency = sourceCurrency.toUpperCase();
    targetCurrency = targetCurrency.toUpperCase();

    if (sourceCurrency === targetCurrency) {
      const error = new Error("Source and target currencies must be different");
      error.statusCode = 400;
      throw error;
    }

    if (!sourceAmountMinor || sourceAmountMinor < 1) {
      const error = new Error("sourceAmountMinor must be at least 1");
      error.statusCode = 400;
      throw error;
    }

    const rate = await this.getRate(sourceCurrency, targetCurrency);

    const targetAmountMinor = Math.round(sourceAmountMinor * rate.rate);

    const expiresAt = new Date(Date.now() + QUOTE_TTL_SECONDS * 1000);

    const quote = await this.quoteRepo.create({
      sourceCurrency,
      targetCurrency,
      sourceAmountMinor,
      targetAmountMinor,
      rate: rate.rate,
      provider: rate.provider,
      status: "ACTIVE",
      expiresAt,
      metadata: { userId, rateId: rate.pair },
    });

    logger.info("FX quote created", {
      quoteId: quote.quoteId,
      pair: `${sourceCurrency}/${targetCurrency}`,
      rate: rate.rate,
      expiresAt,
    });

    return {
      quoteId: quote.quoteId,
      sourceCurrency,
      targetCurrency,
      sourceAmountMinor,
      targetAmountMinor,
      rate: rate.rate,
      expiresAt,
      status: "ACTIVE",
    };
  }

  async validateQuote(quoteId) {
    const quote = await this.quoteRepo.findById(quoteId);

    if (!quote) {
      const error = new Error("FX quote not found");
      error.statusCode = 404;
      throw error;
    }

    if (quote.status !== "ACTIVE") {
      const error = new Error(`FX quote is ${quote.status.toLowerCase()}`);
      error.statusCode = 400;
      throw error;
    }

    if (new Date(quote.expiresAt) < new Date()) {
      const error = new Error("FX quote has expired");
      error.statusCode = 400;
      throw error;
    }

    return quote;
  }

  async markQuoteUsed(quoteId, transactionId) {
    const quote = await this.quoteRepo.markUsed(quoteId, transactionId);

    if (!quote) {
      const error = new Error("FX quote not found or already used");
      error.statusCode = 400;
      throw error;
    }

    logger.info("FX quote marked as used", { quoteId, transactionId });

    return quote;
  }

  async getQuote(quoteId) {
    const quote = await this.quoteRepo.findById(quoteId);

    if (!quote) {
      const error = new Error("FX quote not found");
      error.statusCode = 404;
      throw error;
    }

    return quote;
  }

  async getRate(sourceCurrency, targetCurrency) {
    sourceCurrency = sourceCurrency.toUpperCase();
    targetCurrency = targetCurrency.toUpperCase();

    const pair = `${sourceCurrency}${targetCurrency}`;

    const cachedRate = await this.rateRepo.findLatest(pair);

    if (cachedRate) {
      const cacheAge = (Date.now() - new Date(cachedRate.fetchedAt).getTime()) / 1000;
      if (cacheAge < RATE_CACHE_TTL_SECONDS) {
        logger.info("Using cached rate", { pair, rate: cachedRate.rate, age: cacheAge });
        return {
          pair,
          rate: cachedRate.rate,
          provider: cachedRate.provider,
          fetchedAt: cachedRate.fetchedAt,
          sourceCurrency,
          targetCurrency,
        };
      }
    }

    const rate = await this.fetchRateFromProvider(sourceCurrency, targetCurrency);

    await this.rateRepo.create({
      pair,
      sourceCurrency,
      targetCurrency,
      rate: rate.rate,
      provider: rate.provider,
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + RATE_CACHE_TTL_SECONDS * 1000),
    });

    logger.info("Rate fetched from provider", { pair, rate: rate.rate, provider: rate.provider });

    return {
      pair,
      rate: rate.rate,
      provider: rate.provider,
      fetchedAt: new Date(),
      sourceCurrency,
      targetCurrency,
    };
  }

  async fetchRateFromProvider(sourceCurrency, targetCurrency) {
    const providers = [
      { name: "ECB", baseRate: this.getBaseRate(sourceCurrency, targetCurrency) },
    ];

    const provider = providers[0];
    const variance = (Math.random() - 0.5) * 0.02;
    const rate = parseFloat((provider.baseRate * (1 + variance)).toFixed(6));

    return {
      rate,
      provider: provider.name,
      fetchedAt: new Date(),
    };
  }

  getBaseRate(sourceCurrency, targetCurrency) {
    const rates = {
      USDEUR: 0.92,
      EURUSD: 1.087,
      USDGBP: 0.79,
      GBPUSD: 1.266,
      USDPKR: 280.5,
      PKRUSD: 0.003565,
      EURPKR: 304.89,
      GBPPKR: 355.06,
      USDJPY: 149.5,
      JPYUSD: 0.006689,
      EURJPY: 162.5,
      GBPJPY: 188.7,
    };

    const pair = `${sourceCurrency}${targetCurrency}`;
    const inversePair = `${targetCurrency}${sourceCurrency}`;

    if (rates[pair]) return rates[pair];
    if (rates[inversePair]) return parseFloat((1 / rates[inversePair]).toFixed(6));

    return 1.0;
  }

  async getRecentQuotes(limit = 50) {
    return await this.quoteRepo.findRecent(limit);
  }

  async getRecentRates(limit = 50) {
    return await this.rateRepo.findRecent(limit);
  }

  async getQuoteHistory(sourceCurrency, targetCurrency, limit = 10) {
    return await this.quoteRepo.findByPair(sourceCurrency.toUpperCase(), targetCurrency.toUpperCase(), limit);
  }
}

module.exports = new FxService();

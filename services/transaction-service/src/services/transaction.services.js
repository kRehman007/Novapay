const { TransactionRepository, IdempotencyKeyRepository } = require("../repositories/transaction.repository");
const { generateTransactionId, generateIdempotencyKeyId, hashPayload } = require("../utils/idGenerator");
const { getRedisClient } = require("../config/redis");
const { createLogger } = require("../utils/logger");
const axios = require("axios");

const logger = createLogger({ component: "transaction-service" });

const IDEMPOTENCY_TTL_HOURS = parseInt(process.env.IDEMPOTENCY_TTL_HOURS) || 24;
const ACCOUNT_SERVICE_URL = process.env.ACCOUNT_SERVICE_URL || "http://localhost:4001";
const LEDGER_SERVICE_URL = process.env.LEDGER_SERVICE_URL || "http://localhost:4003";
const FX_SERVICE_URL = process.env.FX_SERVICE_URL || "http://localhost:4004";
const SERVICE_KEY = process.env.SERVICE_KEY;

class TransactionService {
  constructor() {
    this.transactionRepo = new TransactionRepository();
    this.idempotencyRepo = new IdempotencyKeyRepository();
  }

  async createTransfer(transferData, idempotencyKey) {
    const { senderWalletId, senderUserId, receiverWalletId, receiverUserId, amountMinor, currency, description, metadata } = transferData;

    const requestHash = hashPayload(transferData);

    // 1. Check idempotency key
    const existingKey = await this.idempotencyRepo.findByKey(idempotencyKey);
    if (existingKey) {
      if (existingKey.requestHash !== requestHash) {
        const error = new Error("Idempotency key reused with different payload");
        error.statusCode = 409;
        throw error;
      }

      if (existingKey.status === "COMPLETED" || existingKey.status === "FAILED") {
        logger.info("Returning cached response", { idempotencyKey });
        return existingKey.response;
      }

      if (existingKey.status === "PROCESSING") {
        const error = new Error("Transfer already in progress");
        error.statusCode = 409;
        throw error;
      }
    }

    // 2. Validate wallets exist
    const walletValidation = await this.validateWallets([senderWalletId, receiverWalletId]);
    if (walletValidation.invalid.length > 0) {
      const error = new Error("Invalid wallet");
      error.statusCode = 400;
      throw error;
    }

    // 3. Check sender balance
    const senderBalance = await this.getBalance(senderUserId, currency);
    if (senderBalance < amountMinor) {
      const error = new Error("Insufficient balance");
      error.statusCode = 400;
      throw error;
    }

    // 4. Create idempotency key
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000);
    if (!existingKey) {
      await this.idempotencyRepo.create({
        key: idempotencyKey,
        requestHash,
        status: "PROCESSING",
        expiresAt,
      });
    }

    // 5. Create transaction
    const transactionId = generateTransactionId();
    const transaction = await this.transactionRepo.create({
      transactionId,
      type: "TRANSFER",
      status: "PROCESSING",
      idempotencyKey,
      senderWalletId,
      senderUserId,
      receiverWalletId,
      receiverUserId,
      amountMinor,
      currency: currency.toUpperCase(),
      description: description || null,
      metadata: metadata || {},
      requestHash,
    });

    try {
      // 6. Create ledger entries
      const ledgerResult = await this.createLedgerEntries(transaction);
      await this.transactionRepo.updateStatus(transactionId, "COMPLETED", {
        completedAt: new Date(),
        ledgerTransactionId: ledgerResult.transactionId,
      });

      // 7. Update idempotency key
      const response = {
        transactionId,
        status: "COMPLETED",
        amountMinor,
        currency: currency.toUpperCase(),
      };

      await this.idempotencyRepo.updateStatus(idempotencyKey, "COMPLETED", response);

      // 8. Update balance cache
      await this.updateBalanceCache(senderWalletId, -amountMinor);
      await this.updateBalanceCache(receiverWalletId, amountMinor);

      logger.info("Transfer completed", { transactionId, amountMinor, currency });

      return response;
    } catch (error) {
      // 9. Mark as failed
      await this.transactionRepo.updateStatus(transactionId, "FAILED", {
        failedAt: new Date(),
        failureReason: error.message,
      });

      await this.idempotencyRepo.updateStatus(idempotencyKey, "FAILED", {
        transactionId,
        status: "FAILED",
        error: error.message,
      });

      logger.error("Transfer failed", { transactionId, error: error.message });

      throw error;
    }
  }

  async createFxTransfer(transferData, idempotencyKey, fxQuoteId) {
    const { senderWalletId, senderUserId, receiverWalletId, receiverUserId, amountMinor, currency, description, metadata } = transferData;

    const requestHash = hashPayload({ ...transferData, fxQuoteId });

    // 1. Check idempotency key
    const existingKey = await this.idempotencyRepo.findByKey(idempotencyKey);
    if (existingKey) {
      if (existingKey.requestHash !== requestHash) {
        const error = new Error("Idempotency key reused with different payload");
        error.statusCode = 409;
        throw error;
      }

      if (existingKey.status === "COMPLETED" || existingKey.status === "FAILED") {
        logger.info("Returning cached response", { idempotencyKey });
        return existingKey.response;
      }
    }

    // 2. Validate FX quote
    const fxQuote = await this.validateFxQuote(fxQuoteId);

    // 3. Validate wallets
    const walletValidation = await this.validateWallets([senderWalletId, receiverWalletId]);
    if (walletValidation.invalid.length > 0) {
      const error = new Error("Invalid wallet");
      error.statusCode = 400;
      throw error;
    }

    // 4. Check sender balance
    const senderBalance = await this.getBalance(senderUserId, currency);
    if (senderBalance < amountMinor) {
      const error = new Error("Insufficient balance");
      error.statusCode = 400;
      throw error;
    }

    // 5. Create idempotency key
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000);
    if (!existingKey) {
      await this.idempotencyRepo.create({
        key: idempotencyKey,
        requestHash,
        status: "PROCESSING",
        expiresAt,
      });
    }

    // 6. Create transaction
    const transactionId = generateTransactionId();
    const convertedAmountMinor = Math.round(amountMinor * fxQuote.rate);

    const transaction = await this.transactionRepo.create({
      transactionId,
      type: "FX_TRANSFER",
      status: "PROCESSING",
      idempotencyKey,
      senderWalletId,
      senderUserId,
      receiverWalletId,
      receiverUserId,
      amountMinor,
      currency: currency.toUpperCase(),
      fxQuoteId,
      fxRate: fxQuote.rate,
      convertedAmountMinor,
      description: description || null,
      metadata: metadata || {},
      requestHash,
    });

    try {
      // 7. Create ledger entries with FX rate
      const ledgerResult = await this.createFxLedgerEntries(transaction, fxQuote);
      await this.transactionRepo.updateStatus(transactionId, "COMPLETED", {
        completedAt: new Date(),
        ledgerTransactionId: ledgerResult.transactionId,
      });

      // 8. Mark FX quote as used
      await this.markFxQuoteUsed(fxQuoteId, transactionId);

      // 9. Update idempotency key
      const response = {
        transactionId,
        status: "COMPLETED",
        amountMinor,
        currency: currency.toUpperCase(),
        fxRate: fxQuote.rate,
        convertedAmountMinor,
      };

      await this.idempotencyRepo.updateStatus(idempotencyKey, "COMPLETED", response);

      // 10. Update balance cache
      await this.updateBalanceCache(senderWalletId, -amountMinor);

      logger.info("FX Transfer completed", { transactionId, fxRate: fxQuote.rate });

      return response;
    } catch (error) {
      await this.transactionRepo.updateStatus(transactionId, "FAILED", {
        failedAt: new Date(),
        failureReason: error.message,
      });

      await this.idempotencyRepo.updateStatus(idempotencyKey, "FAILED", {
        transactionId,
        status: "FAILED",
        error: error.message,
      });

      logger.error("FX Transfer failed", { transactionId, error: error.message });

      throw error;
    }
  }

  async getTransaction(transactionId) {
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) {
      const error = new Error("Transaction not found");
      error.statusCode = 404;
      throw error;
    }
    return transaction;
  }

  async getUserTransactions(userId, options = {}) {
    return await this.transactionRepo.findByUser(userId, options);
  }

  async reverseTransaction(transactionId, reason) {
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) {
      const error = new Error("Transaction not found");
      error.statusCode = 404;
      throw error;
    }

    if (transaction.status !== "COMPLETED") {
      const error = new Error("Only completed transactions can be reversed");
      error.statusCode = 400;
      throw error;
    }

    if (transaction.type === "REVERSAL") {
      const error = new Error("Cannot reverse a reversal");
      error.statusCode = 400;
      throw error;
    }

    // Create reversal transaction
    const reversalId = generateTransactionId();
    const reversal = await this.transactionRepo.create({
      transactionId: reversalId,
      type: "REVERSAL",
      status: "PROCESSING",
      idempotencyKey: `reversal_${reversalId}`,
      senderWalletId: transaction.receiverWalletId,
      senderUserId: transaction.receiverUserId,
      receiverWalletId: transaction.senderWalletId,
      receiverUserId: transaction.senderUserId,
      amountMinor: transaction.amountMinor,
      currency: transaction.currency,
      description: reason || `Reversal of ${transactionId}`,
      reversalOf: transactionId,
      requestHash: hashPayload({ transactionId, reason }),
    });

    try {
      // Create reverse ledger entries
      await this.createReversalLedgerEntries(transaction, reversal);

      await this.transactionRepo.updateStatus(reversalId, "COMPLETED", {
        completedAt: new Date(),
      });

      await this.transactionRepo.updateStatus(transactionId, "REVERSED", {
        reversedAt: new Date(),
      });

      // Update balance caches
      await this.updateBalanceCache(transaction.senderWalletId, transaction.amountMinor);
      await this.updateBalanceCache(transaction.receiverWalletId, -transaction.amountMinor);

      logger.info("Transaction reversed", { transactionId, reversalId });

      return {
        reversalId,
        status: "COMPLETED",
        originalTransactionId: transactionId,
      };
    } catch (error) {
      await this.transactionRepo.updateStatus(reversalId, "FAILED", {
        failedAt: new Date(),
        failureReason: error.message,
      });

      throw error;
    }
  }

  async getPendingTransactions() {
    return await this.transactionRepo.findPendingOlderThan(5);
  }

  async recoverTransaction(transactionId) {
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) {
      const error = new Error("Transaction not found");
      error.statusCode = 404;
      throw error;
    }

    if (transaction.status === "COMPLETED") {
      return { transactionId, status: "COMPLETED", message: "Already completed" };
    }

    if (transaction.status === "FAILED") {
      return { transactionId, status: "FAILED", message: "Already failed" };
    }

    // Check if ledger entries exist
    const hasEntries = await this.checkLedgerEntries(transactionId);

    if (hasEntries) {
      // Complete the transaction
      await this.transactionRepo.updateStatus(transactionId, "COMPLETED", {
        completedAt: new Date(),
      });

      await this.idempotencyRepo.updateStatus(transaction.idempotencyKey, "COMPLETED", {
        transactionId,
        status: "COMPLETED",
      });

      logger.info("Transaction recovered (entries existed)", { transactionId });

      return { transactionId, status: "COMPLETED", message: "Recovered" };
    } else {
      // No entries, mark as failed
      await this.transactionRepo.updateStatus(transactionId, "FAILED", {
        failedAt: new Date(),
        failureReason: "No ledger entries found during recovery",
      });

      await this.idempotencyRepo.updateStatus(transaction.idempotencyKey, "FAILED", {
        transactionId,
        status: "FAILED",
        error: "No ledger entries found during recovery",
      });

      logger.info("Transaction recovered (no entries, marked failed)", { transactionId });

      return { transactionId, status: "FAILED", message: "No entries found" };
    }
  }

  async validateWallets(walletIds) {
    try {
      const response = await axios.post(
        `${ACCOUNT_SERVICE_URL}/api/accounts/validate`,
        { walletIds },
        { headers: { "X-Service-Key": SERVICE_KEY } }
      );
      return response.data.data;
    } catch (error) {
      logger.error("Failed to validate wallets", { error: error.message });
      throw error;
    }
  }

  async getBalance(userId, currency) {
    try {
      const cacheKey = `balance:${userId}:${currency || "USD"}`;
      const redis = getRedisClient();

      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached !== null) {
          return parseInt(cached, 10);
        }
      }

      const response = await axios.get(
        `${ACCOUNT_SERVICE_URL}/api/internal/accounts/${userId}/balance`,
        {
          params: { currency: currency || "USD" },
          headers: { "X-Service-Key": SERVICE_KEY } }
      );

      return response.data.data.balance;
    } catch (error) {
      logger.error("Failed to get balance", { userId, error: error.message });
      throw error;
    }
  }

  async validateFxQuote(quoteId) {
    try {
      const response = await axios.get(
        `${FX_SERVICE_URL}/api/fx/quote/${quoteId}`,
        { headers: { "X-Service-Key": SERVICE_KEY } }
      );

      const quote = response.data.data;

      if (quote.status !== "ACTIVE") {
        const error = new Error("FX quote is not active");
        error.statusCode = 400;
        throw error;
      }

      if (new Date(quote.expiresAt) < new Date()) {
        const error = new Error("FX quote has expired");
        error.statusCode = 400;
        throw error;
      }

      return quote;
    } catch (error) {
      logger.error("Failed to validate FX quote", { quoteId, error: error.message });
      throw error;
    }
  }

  async markFxQuoteUsed(quoteId, transactionId) {
    try {
      await axios.put(
        `${FX_SERVICE_URL}/api/fx/quote/${quoteId}/use`,
        { transactionId },
        { headers: { "X-Service-Key": SERVICE_KEY } }
      );
    } catch (error) {
      logger.error("Failed to mark FX quote as used", { quoteId, error: error.message });
      throw error;
    }
  }

  async createLedgerEntries(transaction) {
    try {
      const response = await axios.post(
        `${LEDGER_SERVICE_URL}/api/ledger/entries`,
        {
          transactionId: transaction.transactionId,
          type: transaction.type,
          entries: [
            {
              accountId: transaction.senderWalletId,
              entryType: "DEBIT",
              amountMinor: transaction.amountMinor,
              currency: transaction.currency,
            },
            {
              accountId: transaction.receiverWalletId,
              entryType: "CREDIT",
              amountMinor: transaction.amountMinor,
              currency: transaction.currency,
            },
          ],
        },
        { headers: { "X-Service-Key": SERVICE_KEY } }
      );

      return response.data.data;
    } catch (error) {
      logger.error("Failed to create ledger entries", { transactionId: transaction.transactionId, error: error.message });
      throw error;
    }
  }

  async createFxLedgerEntries(transaction, fxQuote) {
    try {
      const response = await axios.post(
        `${LEDGER_SERVICE_URL}/api/ledger/entries`,
        {
          transactionId: transaction.transactionId,
          type: transaction.type,
          entries: [
            {
              accountId: transaction.senderWalletId,
              entryType: "DEBIT",
              amountMinor: transaction.amountMinor,
              currency: transaction.currency,
              fxRate: fxQuote.rate,
              fxQuoteId: transaction.fxQuoteId,
            },
            {
              accountId: transaction.receiverWalletId,
              entryType: "CREDIT",
              amountMinor: transaction.convertedAmountMinor,
              currency: fxQuote.targetCurrency,
              fxRate: fxQuote.rate,
              fxQuoteId: transaction.fxQuoteId,
            },
          ],
        },
        { headers: { "X-Service-Key": SERVICE_KEY } }
      );

      return response.data.data;
    } catch (error) {
      logger.error("Failed to create FX ledger entries", { transactionId: transaction.transactionId, error: error.message });
      throw error;
    }
  }

  async createReversalLedgerEntries(originalTransaction, reversal) {
    try {
      const response = await axios.post(
        `${LEDGER_SERVICE_URL}/api/ledger/entries`,
        {
          transactionId: reversal.transactionId,
          type: "REVERSAL",
          entries: [
            {
              accountId: originalTransaction.receiverWalletId,
              entryType: "DEBIT",
              amountMinor: originalTransaction.amountMinor,
              currency: originalTransaction.currency,
            },
            {
              accountId: originalTransaction.senderWalletId,
              entryType: "CREDIT",
              amountMinor: originalTransaction.amountMinor,
              currency: originalTransaction.currency,
            },
          ],
        },
        { headers: { "X-Service-Key": SERVICE_KEY } }
      );

      return response.data.data;
    } catch (error) {
      logger.error("Failed to create reversal ledger entries", { error: error.message });
      throw error;
    }
  }

  async checkLedgerEntries(transactionId) {
    try {
      const response = await axios.get(
        `${LEDGER_SERVICE_URL}/api/ledger/entries/${transactionId}`,
        { headers: { "X-Service-Key": SERVICE_KEY } }
      );

      return response.data.data && response.data.data.length > 0;
    } catch (error) {
      return false;
    }
  }

  async updateBalanceCache(walletId, amountChange) {
    const cacheKey = `balance:${walletId}`;
    const redis = getRedisClient();

    if (redis) {
      const current = await redis.get(cacheKey);
      if (current !== null) {
        const newBalance = parseInt(current, 10) + amountChange;
        await redis.setex(cacheKey, 300, newBalance.toString());
      }
    }
  }

  async runRecovery() {
    logger.info("Starting transaction recovery");

    const pending = await this.getPendingTransactions();
    let recovered = 0;
    let failed = 0;

    for (const tx of pending) {
      try {
        const result = await this.recoverTransaction(tx.transactionId);
        if (result.status === "COMPLETED") recovered++;
        if (result.status === "FAILED") failed++;
      } catch (error) {
        logger.error("Recovery failed for transaction", {
          transactionId: tx.transactionId,
          error: error.message,
        });
        failed++;
      }
    }

    logger.info("Transaction recovery completed", { recovered, failed });

    return { recovered, failed, total: pending.length };
  }
}

module.exports = new TransactionService();

const {
  LedgerAccountRepository,
  LedgerEntryRepository,
  LedgerTransactionRepository,
  AuditLogRepository,
} = require("../repositories/ledger.repository");
const { generateLedgerTransactionId, computeChainHash } = require("../utils/idGenerator");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "ledger-service" });

class LedgerService {
  constructor() {
    this.accountRepo = new LedgerAccountRepository();
    this.entryRepo = new LedgerEntryRepository();
    this.transactionRepo = new LedgerTransactionRepository();
    this.auditLogRepo = new AuditLogRepository();
  }

  async createEntries(requestData) {
    const { transactionId, type, entries, description, metadata, reference } = requestData;

    if (!entries || entries.length < 2) {
      const error = new Error("At least 2 entries required for double-entry bookkeeping");
      error.statusCode = 400;
      throw error;
    }

    const totalDebit = entries.filter((e) => e.entryType === "DEBIT").reduce((sum, e) => sum + e.amountMinor, 0);
    const totalCredit = entries.filter((e) => e.entryType === "CREDIT").reduce((sum, e) => sum + e.amountMinor, 0);

    const isFxTransfer = type === "FX_TRANSFER";

    if (!isFxTransfer && totalDebit !== totalCredit) {
      const error = new Error(`Invariant check failed: debits (${totalDebit}) != credits (${totalCredit})`);
      error.statusCode = 400;
      throw error;
    }

    if (isFxTransfer) {
      const hasFxRate = entries.every((e) => e.fxRate && e.fxRate > 0);
      if (!hasFxRate) {
        const error = new Error("FX entries must include valid fxRate");
        error.statusCode = 400;
        throw error;
      }
    }

    const isInvariantBalanced = isFxTransfer ? true : totalDebit === totalCredit;

    await this.logAudit({
      transactionId,
      action: "TRANSACTION_CREATED",
      details: { type, entryCount: entries.length, totalDebit, totalCredit, isInvariantBalanced },
    });

    const ledgerTx = await this.transactionRepo.create({
      transactionId,
      type,
      status: "PENDING",
      reference: reference || transactionId,
      description: description || null,
      metadata: metadata || {},
      totalDebitMinor: totalDebit,
      totalCreditMinor: totalCredit,
      isInvariantBalanced,
    });

    try {
      const entriesWithIds = entries.map((e) => ({
        ...e,
        transactionId: ledgerTx.transactionId,
        entryType: e.entryType.toUpperCase(),
        currency: e.currency.toUpperCase(),
      }));

      const savedEntries = await this.entryRepo.createMany(entriesWithIds);

      for (const entry of savedEntries) {
        await this.logAudit({
          transactionId: ledgerTx.transactionId,
          action: "ENTRY_CREATED",
          actorId: entry.accountId,
          details: {
            entryId: entry.entryId,
            entryType: entry.entryType,
            amountMinor: entry.amountMinor,
            currency: entry.currency,
            accountId: entry.accountId,
          },
        });
      }

      await this.logAudit({
        transactionId: ledgerTx.transactionId,
        action: isInvariantBalanced ? "INVARIANT_CHECK_PASSED" : "INVARIANT_CHECK_FAILED",
        details: { totalDebit, totalCredit, difference: totalDebit - totalCredit },
      });

      await this.transactionRepo.updateStatus(ledgerTx.transactionId, "COMPLETED", {
        completedAt: new Date(),
      });

      await this.logAudit({
        transactionId: ledgerTx.transactionId,
        action: "TRANSACTION_COMPLETED",
        details: { totalDebit, totalCredit, entryCount: savedEntries.length },
      });

      logger.info("Ledger entries created", {
        transactionId: ledgerTx.transactionId,
        entryCount: savedEntries.length,
        totalDebit,
        totalCredit,
      });

      return {
        transactionId: ledgerTx.transactionId,
        status: "COMPLETED",
        entries: savedEntries,
        totalDebitMinor: totalDebit,
        totalCreditMinor: totalCredit,
        isInvariantBalanced,
      };
    } catch (error) {
      await this.transactionRepo.updateStatus(ledgerTx.transactionId, "FAILED", {
        failedAt: new Date(),
      });

      await this.logAudit({
        transactionId: ledgerTx.transactionId,
        action: "TRANSACTION_FAILED",
        details: { error: error.message },
      });

      logger.error("Failed to create ledger entries", {
        transactionId: ledgerTx.transactionId,
        error: error.message,
      });

      throw error;
    }
  }

  async getEntriesByTransactionId(transactionId) {
    return await this.entryRepo.findByTransactionId(transactionId);
  }

  async getEntriesByAccountId(accountId, options = {}) {
    return await this.entryRepo.findByAccountId(accountId, options);
  }

  async getBalance(accountId, currency) {
    const balance = await this.entryRepo.getBalanceByAccount(accountId, currency);
    return { accountId, currency, balance };
  }

  async getLedgerTransaction(transactionId) {
    return await this.transactionRepo.findById(transactionId);
  }

  async getRecentTransactions(limit = 50) {
    return await this.transactionRepo.findRecent(limit);
  }

  async verifyAuditLogIntegrity() {
    return await this.auditLogRepo.verifyChainIntegrity();
  }

  async getAuditLogs(transactionId) {
    if (transactionId) {
      return await this.auditLogRepo.findByTransactionId(transactionId);
    }
    return await this.auditLogRepo.findRecent(100);
  }

  async logAudit({ transactionId, action, actorId, details }) {
    const previousLog = await this.auditLogRepo.getLatest();
    const previousHash = previousLog ? previousLog.hash : null;

    const data = {
      transactionId,
      action,
      actorId: actorId || "SYSTEM",
      details: details || {},
      previousHash,
    };

    const hash = computeChainHash(previousHash, data);

    return await this.auditLogRepo.create({
      ...data,
      hash,
    });
  }
}

module.exports = new LedgerService();

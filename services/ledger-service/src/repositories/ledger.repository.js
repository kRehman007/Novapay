const LedgerAccount = require("../models/ledgerAccount.model");
const LedgerEntry = require("../models/ledgerEntry.model");
const LedgerTransaction = require("../models/ledgerTransaction.model");
const AuditLog = require("../models/auditLog.model");
const { generateLedgerAccountId, generateLedgerEntryId, generateLedgerTransactionId, generateAuditLogId, computeChainHash } = require("../utils/idGenerator");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "ledger-repository" });

class LedgerAccountRepository {
  async create(accountData) {
    const accountId = accountData.accountId || generateLedgerAccountId();
    const account = new LedgerAccount({ ...accountData, accountId });
    return await account.save();
  }

  async findById(accountId) {
    return await LedgerAccount.findOne({ accountId });
  }

  async findByOwner(ownerId, currency) {
    const query = { ownerId };
    if (currency) query.currency = currency.toUpperCase();
    return await LedgerAccount.find(query);
  }

  async updateStatus(accountId, status) {
    return await LedgerAccount.findOneAndUpdate({ accountId }, { status }, { returnDocument: "after" });
  }
}

class LedgerEntryRepository {
  async create(entryData) {
    const entryId = entryData.entryId || generateLedgerEntryId();
    const entry = new LedgerEntry({ ...entryData, entryId });
    return await entry.save();
  }

  async createMany(entries) {
    const entriesWithIds = entries.map((e) => ({
      ...e,
      entryId: e.entryId || generateLedgerEntryId(),
    }));
    return await LedgerEntry.insertMany(entriesWithIds);
  }

  async findByTransactionId(transactionId) {
    return await LedgerEntry.find({ transactionId }).sort({ createdAt: 1 });
  }

  async findByAccountId(accountId, options = {}) {
    const query = { accountId };
    if (options.currency) query.currency = options.currency.toUpperCase();

    const sort = options.sort || { createdAt: -1 };
    const limit = options.limit || 100;
    const skip = options.skip || 0;

    return await LedgerEntry.find(query).sort(sort).skip(skip).limit(limit);
  }

  async getBalanceByAccount(accountId, currency) {
    const entries = await LedgerEntry.find({ accountId, currency });
    let balance = 0;
    for (const entry of entries) {
      if (entry.entryType === "CREDIT") {
        balance += entry.amountMinor;
      } else {
        balance -= entry.amountMinor;
      }
    }
    return balance;
  }

  async countByTransactionId(transactionId) {
    return await LedgerEntry.countDocuments({ transactionId });
  }
}

class LedgerTransactionRepository {
  async create(transactionData) {
    const ledgerTxId = generateLedgerTransactionId();
    const ledgerTx = new LedgerTransaction({ ...transactionData, transactionId: ledgerTxId });
    return await ledgerTx.save();
  }

  async findById(transactionId) {
    return await LedgerTransaction.findOne({ transactionId });
  }

  async findByReference(reference) {
    return await LedgerTransaction.findOne({ reference });
  }

  async updateStatus(transactionId, status, updates = {}) {
    return await LedgerTransaction.findOneAndUpdate(
      { transactionId },
      { status, ...updates },
      { returnDocument: "after" }
    );
  }

  async updateTotals(transactionId, totalDebitMinor, totalCreditMinor, isInvariantBalanced) {
    return await LedgerTransaction.findOneAndUpdate(
      { transactionId },
      { totalDebitMinor, totalCreditMinor, isInvariantBalanced },
      { returnDocument: "after" }
    );
  }

  async findRecent(limit = 50) {
    return await LedgerTransaction.find().sort({ createdAt: -1 }).limit(limit);
  }
}

class AuditLogRepository {
  async create(logData) {
    const logId = generateAuditLogId();
    const log = new AuditLog({ ...logData, logId });
    return await log.save();
  }

  async getLatest() {
    return await AuditLog.findOne().sort({ timestamp: -1 });
  }

  async findByTransactionId(transactionId) {
    return await AuditLog.find({ transactionId }).sort({ timestamp: 1 });
  }

  async findRecent(limit = 100) {
    return await AuditLog.find().sort({ timestamp: -1 }).limit(limit);
  }

  async verifyChainIntegrity() {
    const logs = await AuditLog.find().sort({ timestamp: 1 });
    let previousHash = null;

    for (const log of logs) {
      if (log.previousHash !== previousHash) {
        return {
          valid: false,
          brokenAt: log.logId,
          expected: previousHash,
          actual: log.previousHash,
        };
      }
      previousHash = log.hash;
    }

    return { valid: true, totalLogs: logs.length };
  }
}

module.exports = {
  LedgerAccountRepository,
  LedgerEntryRepository,
  LedgerTransactionRepository,
  AuditLogRepository,
};

const Transaction = require("../models/transaction.model");
const IdempotencyKey = require("../models/idempotencyKey.model");

class TransactionRepository {
  async create(transactionData) {
    const transaction = new Transaction(transactionData);
    return await transaction.save();
  }

  async findById(transactionId) {
    return await Transaction.findOne({ transactionId });
  }

  async findByIdempotencyKey(idempotencyKey) {
    return await Transaction.findOne({ idempotencyKey });
  }

  async updateStatus(transactionId, status, additionalData = {}) {
    return await Transaction.findOneAndUpdate(
      { transactionId },
      { $set: { status, ...additionalData } },
      { new: true }
    );
  }

  async findPendingOlderThan(minutes) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return await Transaction.find({
      status: { $in: ["PENDING", "PROCESSING"] },
      createdAt: { $lt: cutoff },
    }).sort({ createdAt: 1 });
  }

  async findByUser(userId, options = {}) {
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const filter = {
      $or: [{ senderUserId: userId }, { receiverUserId: userId }],
    };

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort(sort).skip(skip).limit(limit),
      Transaction.countDocuments(filter),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAll(filter = {}, options = {}) {
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort(sort).skip(skip).limit(limit),
      Transaction.countDocuments(filter),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

class IdempotencyKeyRepository {
  async create(keyData) {
    const key = new IdempotencyKey(keyData);
    return await key.save();
  }

  async findByKey(key) {
    return await IdempotencyKey.findOne({ key });
  }

  async updateStatus(key, status, response = null) {
    return await IdempotencyKey.findOneAndUpdate(
      { key },
      { $set: { status, response } },
      { new: true }
    );
  }

  async findExpired() {
    return await IdempotencyKey.find({
      expiresAt: { $lt: new Date() },
    });
  }

  async deleteExpired() {
    return await IdempotencyKey.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  }
}

module.exports = {
  TransactionRepository,
  IdempotencyKeyRepository,
};

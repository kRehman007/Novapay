const PayrollBatch = require("../models/payrollBatch.model");
const PayrollItem = require("../models/payrollItem.model");
const { generateBatchId, generateItemId } = require("../utils/idGenerator");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "payroll-repository" });

class PayrollBatchRepository {
  async create(batchData) {
    const batchId = batchData.batchId || generateBatchId();
    const batch = new PayrollBatch({ ...batchData, batchId });
    return await batch.save();
  }

  async findById(batchId) {
    return await PayrollBatch.findOne({ batchId });
  }

  async findByEmployer(employerId, options = {}) {
    const query = { employerId };
    if (options.status) query.status = options.status;

    const sort = options.sort || { createdAt: -1 };
    const limit = options.limit || 50;
    const skip = options.skip || 0;

    return await PayrollBatch.find(query).sort(sort).skip(skip).limit(limit);
  }

  async updateStatus(batchId, status, updates = {}) {
    return await PayrollBatch.findOneAndUpdate(
      { batchId },
      { status, ...updates },
      { returnDocument: "after" }
    );
  }

  async incrementProgress(batchId, processed, successful, failed, amount) {
    return await PayrollBatch.findOneAndUpdate(
      { batchId },
      {
        $inc: {
          processedItems: processed,
          successfulItems: successful,
          failedItems: failed,
          processedAmountMinor: amount,
        },
      },
      { returnDocument: "after" }
    );
  }

  async updateLastProcessedIndex(batchId, index) {
    return await PayrollBatch.findOneAndUpdate(
      { batchId },
      { lastProcessedIndex: index },
      { returnDocument: "after" }
    );
  }

  async findPendingOrProcessing() {
    return await PayrollBatch.find({
      status: { $in: ["PROCESSING", "PARTIAL"] },
    });
  }
}

class PayrollItemRepository {
  async create(itemData) {
    const itemId = itemData.itemId || generateItemId();
    const item = new PayrollItem({ ...itemData, itemId });
    return await item.save();
  }

  async createMany(items) {
    const itemsWithIds = items.map((item) => ({
      ...item,
      itemId: item.itemId || generateItemId(),
    }));
    return await PayrollItem.insertMany(itemsWithIds);
  }

  async findById(itemId) {
    return await PayrollItem.findOne({ itemId });
  }

  async findByBatchId(batchId, options = {}) {
    const query = { batchId };
    if (options.status) query.status = options.status;

    const sort = options.sort || { createdAt: 1 };
    const limit = options.limit || 1000;
    const skip = options.skip || 0;

    return await PayrollItem.find(query).sort(sort).skip(skip).limit(limit);
  }

  async findPendingByBatchId(batchId) {
    return await PayrollItem.find({ batchId, status: "PENDING" }).sort({ createdAt: 1 });
  }

  async updateStatus(itemId, status, updates = {}) {
    return await PayrollItem.findOneAndUpdate(
      { itemId },
      { status, ...updates },
      { returnDocument: "after" }
    );
  }

  async countByBatchAndStatus(batchId, status) {
    return await PayrollItem.countDocuments({ batchId, status });
  }

  async getBatchStats(batchId) {
    const stats = await PayrollItem.aggregate([
      { $match: { batchId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amountMinor" },
        },
      },
    ]);

    const result = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0, totalAmount: 0 };
    for (const stat of stats) {
      result[stat._id] = stat.count;
      if (stat._id === "COMPLETED") {
        result.totalAmount += stat.totalAmount;
      }
    }
    return result;
  }
}

module.exports = { PayrollBatchRepository, PayrollItemRepository };

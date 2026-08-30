const { Queue, Worker } = require("bullmq");
const { PayrollBatchRepository, PayrollItemRepository } = require("../repositories/payroll.repository");
const { getRedisClient } = require("../config/redis");
const { generateBatchId, generateIdempotencyKeyId } = require("../utils/idGenerator");
const { createLogger } = require("../utils/logger");
const axios = require("axios");

const logger = createLogger({ component: "payroll-service" });

const TRANSACTION_SERVICE_URL = process.env.TRANSACTION_SERVICE_URL || "http://localhost:4002";
const ACCOUNT_SERVICE_URL = process.env.ACCOUNT_SERVICE_URL || "http://localhost:4001";
const SERVICE_KEY = process.env.SERVICE_KEY;
const PAYROLL_CONCURRENCY = parseInt(process.env.PAYROLL_CONCURRENCY) || 1;
const PAYROLL_MAX_RETRIES = parseInt(process.env.PAYROLL_MAX_RETRIES) || 3;

class PayrollService {
  constructor() {
    this.batchRepo = new PayrollBatchRepository();
    this.itemRepo = new PayrollItemRepository();
    this.queue = null;
    this.worker = null;
  }

  async initializeQueue() {
    const redis = getRedisClient();

    this.queue = new Queue("payroll-transfers", {
      connection: redis,
      defaultJobOptions: {
        attempts: PAYROLL_MAX_RETRIES,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.worker = new Worker(
      "payroll-transfers",
      async (job) => {
        await this.processItem(job.data.itemId, job.data.batchId);
      },
      {
        connection: redis,
        concurrency: PAYROLL_CONCURRENCY,
      }
    );

    this.worker.on("completed", (job) => {
      logger.info("Payroll item processed", { itemId: job.data.itemId, batchId: job.data.batchId });
    });

    this.worker.on("failed", (job, err) => {
      logger.error("Payroll item failed", {
        itemId: job?.data?.itemId,
        batchId: job?.data?.batchId,
        error: err.message,
      });
    });

    logger.info("Payroll queue initialized", { concurrency: PAYROLL_CONCURRENCY });
  }

  async createBatch({ employerId, employerWalletId, name, currency, items, idempotencyKey }) {
    if (!items || items.length === 0) {
      const error = new Error("At least one item required");
      error.statusCode = 400;
      throw error;
    }

    const totalAmountMinor = items.reduce((sum, item) => sum + item.amountMinor, 0);

    const batch = await this.batchRepo.create({
      employerId,
      employerWalletId,
      name,
      currency: currency.toUpperCase(),
      status: "PENDING",
      totalItems: items.length,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      totalAmountMinor,
      processedAmountMinor: 0,
      lastProcessedIndex: 0,
      idempotencyKey,
    });

    const payrollItems = items.map((item, index) => ({
      batchId: batch.batchId,
      employeeId: item.employeeId,
      employeeWalletId: item.employeeWalletId,
      amountMinor: item.amountMinor,
      status: "PENDING",
      retryCount: 0,
      maxRetries: PAYROLL_MAX_RETRIES,
      idempotencyKey: `${idempotencyKey}_${index}`,
      metadata: item.metadata || {},
    }));

    await this.itemRepo.createMany(payrollItems);

    logger.info("Payroll batch created", {
      batchId: batch.batchId,
      totalItems: items.length,
      totalAmountMinor,
    });

    return {
      batchId: batch.batchId,
      status: "PENDING",
      totalItems: items.length,
      totalAmountMinor,
    };
  }

  async getBatch(batchId) {
    const batch = await this.batchRepo.findById(batchId);
    if (!batch) {
      const error = new Error("Batch not found");
      error.statusCode = 404;
      throw error;
    }
    return batch;
  }

  async getBatchItems(batchId, options = {}) {
    return await this.itemRepo.findByBatchId(batchId, options);
  }

  async getBatchStats(batchId) {
    return await this.itemRepo.getBatchStats(batchId);
  }

  async startBatch(batchId) {
    const batch = await this.batchRepo.findById(batchId);
    if (!batch) {
      const error = new Error("Batch not found");
      error.statusCode = 404;
      throw error;
    }

    if (batch.status !== "PENDING" && batch.status !== "PARTIAL") {
      const error = new Error(`Cannot start batch in ${batch.status} status`);
      error.statusCode = 400;
      throw error;
    }

    await this.batchRepo.updateStatus(batchId, "PROCESSING", {
      startedAt: new Date(),
    });

    const pendingItems = await this.itemRepo.findPendingByBatchId(batchId);

    for (const item of pendingItems) {
      await this.queue.add("payroll-item", {
        itemId: item.itemId,
        batchId: batch.batchId,
      }, {
        jobId: item.itemId,
      });
    }

    logger.info("Payroll batch started", { batchId, itemCount: pendingItems.length });

    return { batchId, status: "PROCESSING", queuedItems: pendingItems.length };
  }

  async processItem(itemId, batchId) {
    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }

    if (item.status === "COMPLETED") {
      return { itemId, status: "COMPLETED", message: "Already completed" };
    }

    await this.itemRepo.updateStatus(itemId, "PROCESSING");

    try {
      const batch = await this.batchRepo.findById(batchId);

      const transferResult = await axios.post(
        `${TRANSACTION_SERVICE_URL}/api/transfers/domestic`,
        {
          senderWalletId: batch.employerWalletId,
          senderUserId: batch.employerId,
          receiverWalletId: item.employeeWalletId,
          receiverUserId: item.employeeId,
          amountMinor: item.amountMinor,
          currency: batch.currency,
          description: `Payroll: ${batch.name}`,
          metadata: { batchId, itemId },
        },
        {
          headers: {
            "X-Service-Key": SERVICE_KEY,
            "Authorization": `Bearer ${SERVICE_KEY}`,
          },
        }
      );

      const transactionId = transferResult.data.data.transactionId;

      await this.itemRepo.updateStatus(itemId, "COMPLETED", {
        transactionId,
        processedAt: new Date(),
      });

      await this.batchRepo.incrementProgress(batchId, 1, 1, 0, item.amountMinor);

      const batchItems = await this.itemRepo.findByBatchId(batchId);
      const lastIndex = batchItems.findIndex((i) => i.itemId === itemId);
      await this.batchRepo.updateLastProcessedIndex(batchId, lastIndex + 1);

      const stats = await this.itemRepo.getBatchStats(batchId);
      if (stats.PENDING === 0 && stats.PROCESSING === 0) {
        const newStatus = stats.FAILED === 0 ? "COMPLETED" : "PARTIAL";
        await this.batchRepo.updateStatus(batchId, newStatus, {
          completedAt: new Date(),
        });
      }

      return { itemId, status: "COMPLETED", transactionId };
    } catch (error) {
      const newRetryCount = item.retryCount + 1;

      if (newRetryCount >= item.maxRetries) {
        await this.itemRepo.updateStatus(itemId, "FAILED", {
          failureReason: error.message,
          retryCount: newRetryCount,
        });

        await this.batchRepo.incrementProgress(batchId, 1, 0, 1, 0);

        const stats = await this.itemRepo.getBatchStats(batchId);
        if (stats.PENDING === 0 && stats.PROCESSING === 0) {
          await this.batchRepo.updateStatus(batchId, "PARTIAL", {
            completedAt: new Date(),
          });
        }
      } else {
        await this.itemRepo.updateStatus(itemId, "PENDING", {
          failureReason: error.message,
          retryCount: newRetryCount,
        });
      }

      throw error;
    }
  }

  async pauseBatch(batchId) {
    const batch = await this.batchRepo.findById(batchId);
    if (!batch) {
      const error = new Error("Batch not found");
      error.statusCode = 404;
      throw error;
    }

    if (batch.status !== "PROCESSING") {
      const error = new Error("Only processing batches can be paused");
      error.statusCode = 400;
      throw error;
    }

    await this.batchRepo.updateStatus(batchId, "PAUSED");

    if (this.queue) {
      const jobs = await this.queue.getJobs(["waiting", "active"]);
      for (const job of jobs) {
        if (job.data.batchId === batchId) {
          await job.pause();
        }
      }
    }

    logger.info("Payroll batch paused", { batchId });
    return { batchId, status: "PAUSED" };
  }

  async resumeBatch(batchId) {
    const batch = await this.batchRepo.findById(batchId);
    if (!batch) {
      const error = new Error("Batch not found");
      error.statusCode = 404;
      throw error;
    }

    if (batch.status !== "PAUSED") {
      const error = new Error("Only paused batches can be resumed");
      error.statusCode = 400;
      throw error;
    }

    await this.batchRepo.updateStatus(batchId, "PROCESSING");

    if (this.queue) {
      const jobs = await this.queue.getJobs(["paused"]);
      for (const job of jobs) {
        if (job.data.batchId === batchId) {
          await job.resume();
        }
      }
    }

    logger.info("Payroll batch resumed", { batchId });
    return { batchId, status: "PROCESSING" };
  }

  async recoverBatches() {
    logger.info("Starting payroll batch recovery");

    const incompleteBatches = await this.batchRepo.findPendingOrProcessing();
    let recovered = 0;

    for (const batch of incompleteBatches) {
      try {
        await this.batchRepo.updateStatus(batch.batchId, "PARTIAL");
        await this.startBatch(batch.batchId);
        recovered++;
      } catch (error) {
        logger.error("Recovery failed for batch", {
          batchId: batch.batchId,
          error: error.message,
        });
      }
    }

    logger.info("Payroll batch recovery completed", { recovered, total: incompleteBatches.length });
    return { recovered, total: incompleteBatches.length };
  }

  async getRecentBatches(limit = 50) {
    return await this.batchRepo.findByEmployer(null, { limit });
  }

  async close() {
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
  }
}

module.exports = new PayrollService();

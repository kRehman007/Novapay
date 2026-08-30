// PayrollBatch = the whole payroll job

// Imagine a company has 100 employees and wants to pay everyone's salary.
// Instead of creating 100 completely separate payroll jobs, NovaPay creates one batch

// PayrollBatch maintains the overall record
// It tracks things like:
// Total employees: 100
// Processed: 100
// Successful: 97
// Failed: 3
// Total amount: PKR 10M
// Status: PARTIAL
const mongoose = require("mongoose");

const payrollBatchSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    employerId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    employerWalletId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },

    status: {
      type: String,
      required: true,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "PARTIAL", "FAILED", "PAUSED"],
      default: "PENDING",
      index: true,
    },

    totalItems: {
      type: Number,
      required: true,
      min: 0,
    },

    processedItems: {
      type: Number,
      default: 0,
      min: 0,
    },

    successfulItems: {
      type: Number,
      default: 0,
      min: 0,
    },

    failedItems: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmountMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "totalAmountMinor must be an integer",
      },
    },

    processedAmountMinor: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastProcessedIndex: {
      type: Number,
      default: 0,
      min: 0,
    },

    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "payrollBatches",
  }
);

payrollBatchSchema.index({ employerId: 1, status: 1 });
payrollBatchSchema.index({ employerId: 1, createdAt: -1 });

const PayrollBatch = mongoose.model("PayrollBatch", payrollBatchSchema);

module.exports = PayrollBatch;

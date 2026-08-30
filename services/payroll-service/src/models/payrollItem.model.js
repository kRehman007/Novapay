// PayrollItem = one employee's payment inside that job
// PayrollItem maintains each employee's record

// For example:
// Employee: Ali
// Amount: PKR 50,000
// Status: COMPLETED
// Transaction: TXN-123

const mongoose = require("mongoose");

const payrollItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    batchId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    employeeId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    employeeWalletId: {
      type: String,
      required: true,
      trim: true,
    },

    amountMinor: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "amountMinor must be an integer",
      },
    },

    status: {
      type: String,
      required: true,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      default: "PENDING",
      index: true,
    },

    transactionId: {
      type: String,
      default: null,
      index: true,
    },

    failureReason: {
      type: String,
      default: null,
    },

    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "payrollItems",
  }
);

payrollItemSchema.index({ batchId: 1, status: 1 });
payrollItemSchema.index({ batchId: 1, employeeId: 1 });

const PayrollItem = mongoose.model("PayrollItem", payrollItemSchema);

module.exports = PayrollItem;

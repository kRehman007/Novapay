const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["TRANSFER", "PAYROLL", "FEE", "REFUND", "FX_TRANSFER", "REVERSAL"],
    },

    status: {
      type: String,
      required: true,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REVERSED"],
      default: "PENDING",
      index: true,
    },

    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    senderWalletId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    receiverWalletId: {
      type: String,
      required: true,
      index: true,
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

    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },

    fxQuoteId: {
      type: String,
      default: null,
      index: true,
    },

    fxRate: {
      type: Number,
      default: null,
      min: 0,
    },

    feeAmountMinor: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "feeAmountMinor must be an integer",
      },
    },

    description: {
      type: String,
      default: null,
      trim: true,
    },

    reference: {
      type: String,
      default: null,
      trim: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    completedAt: {
      type: Date,
      default: null,
    },

    failedAt: {
      type: Date,
      default: null,
    },

    failureReason: {
      type: String,
      default: null,
    },

    reversedAt: {
      type: Date,
      default: null,
    },

    reversalOf: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "transactions",
  }
);

transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ senderWalletId: 1, createdAt: -1 });
transactionSchema.index({ receiverWalletId: 1, createdAt: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;

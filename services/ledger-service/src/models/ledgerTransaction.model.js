const mongoose = require("mongoose");

const ledgerTransactionSchema = new mongoose.Schema(
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
      enum: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
      default: "PENDING",
      index: true,
    },

    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    description: {
      type: String,
      default: null,
      trim: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    totalDebitMinor: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCreditMinor: {
      type: Number,
      default: 0,
      min: 0,
    },

    isInvariantBalanced: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    failedAt: {
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
    collection: "ledgerTransactions",
  }
);

ledgerTransactionSchema.index({ createdAt: -1 });
ledgerTransactionSchema.index({ status: 1, createdAt: -1 });
ledgerTransactionSchema.index({ type: 1, createdAt: -1 });

const LedgerTransaction = mongoose.model("LedgerTransaction", ledgerTransactionSchema);

module.exports = LedgerTransaction;

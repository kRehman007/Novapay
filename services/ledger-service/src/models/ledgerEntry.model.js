const mongoose = require("mongoose");

const ledgerEntrySchema = new mongoose.Schema(
  {
    entryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    transactionId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    accountId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    entryType: {
      type: String,
      required: true,
      enum: ["DEBIT", "CREDIT"],
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

    fxRate: {
      type: Number,
      default: null,
      min: 0,
    },

    fxQuoteId: {
      type: String,
      default: null,
      index: true,
    },

    feeEntryType: {
      type: String,
      enum: ["MAIN", "FEE"],
      default: "MAIN",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "ledgerEntries",
  }
);

ledgerEntrySchema.index({ transactionId: 1 });
ledgerEntrySchema.index({ accountId: 1, createdAt: -1 });
ledgerEntrySchema.index({ accountId: 1, currency: 1, createdAt: -1 });
ledgerEntrySchema.index({ fxQuoteId: 1 });

const LedgerEntry = mongoose.model("LedgerEntry", ledgerEntrySchema);

module.exports = LedgerEntry;

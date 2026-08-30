const mongoose = require("mongoose");

const ledgerAccountSchema = new mongoose.Schema(
  {
    accountId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    ownerId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    ownerType: {
      type: String,
      required: true,
      enum: ["USER", "SYSTEM", "FEE_ACCOUNT"],
      default: "USER",
    },

    accountType: {
      type: String,
      required: true,
      enum: ["WALLET", "FEE", "SYSTEM"],
      default: "WALLET",
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
      enum: ["ACTIVE", "SUSPENDED", "CLOSED"],
      default: "ACTIVE",
      index: true,
    },

    normalBalance: {
      type: String,
      required: true,
      enum: ["DEBIT", "CREDIT"],
      default: "DEBIT",
    },
  },
  {
    timestamps: true,
    collection: "ledgerAccounts",
  }
);

ledgerAccountSchema.index({ ownerId: 1, currency: 1 });
ledgerAccountSchema.index({ ownerId: 1, accountType: 1 });

const LedgerAccount = mongoose.model("LedgerAccount", ledgerAccountSchema);

module.exports = LedgerAccount;

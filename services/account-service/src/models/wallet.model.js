const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    walletId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
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

    balanceCached: {
      type: Number,
      default: 0,
      min: 0,
    },

    balanceUpdatedAt: {
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
    collection: "wallets",
  }
);

walletSchema.index({ userId: 1, currency: 1 }, { unique: true });
walletSchema.index({ status: 1, createdAt: -1 });

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;

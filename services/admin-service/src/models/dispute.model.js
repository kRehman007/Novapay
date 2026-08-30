// A dispute is basically a complaint raised by a user about a financial transaction.
// For example:
// "I was charged twice for the same payment."
// or
// "I sent money, but the receiver never received it."
// The Dispute model stores these complaints and tracks how the admin team handles them.

const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema(
  {
    disputeId: {
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

    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["DUPLICATE_CHARGE", "NOT_RECEIVED", "WRONG_AMOUNT", "UNAUTHORIZED", "OTHER"],
    },

    status: {
      type: String,
      required: true,
      enum: ["OPEN", "INVESTIGATING", "RESOLVED", "REJECTED"],
      default: "OPEN",
      index: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    resolution: {
      type: String,
      default: null,
    },

    assignedTo: {
      type: String,
      default: null,
      index: true,
    },

    resolvedAt: {
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
    collection: "disputes",
  }
);

disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ userId: 1, status: 1 });

const Dispute = mongoose.model("Dispute", disputeSchema);

module.exports = Dispute;

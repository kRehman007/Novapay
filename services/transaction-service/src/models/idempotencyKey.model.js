const mongoose = require("mongoose");

const idempotencyKeySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    requestHash: {
      type: String,
      required: true,
    },

    transactionId: {
      type: String,
      default: null,
      index: true,
    },

    status: {
      type: String,
      required: true,
      enum: ["PROCESSING", "COMPLETED", "FAILED"],
      default: "PROCESSING",
      index: true,
    },

    response: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
    collection: "idempotencyKeys",
  }
);

idempotencyKeySchema.index({ key: 1, status: 1 });

const IdempotencyKey = mongoose.model("IdempotencyKey", idempotencyKeySchema);

module.exports = IdempotencyKey;

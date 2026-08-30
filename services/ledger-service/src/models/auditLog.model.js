const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    logId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    transactionId: {
      type: String,
      default: null,
      index: true,
    },

    action: {
      type: String,
      required: true,
      enum: [
        "TRANSACTION_CREATED",
        "TRANSACTION_COMPLETED",
        "TRANSACTION_FAILED",
        "TRANSACTION_REVERSED",
        "ENTRY_CREATED",
        "INVARIANT_CHECK_PASSED",
        "INVARIANT_CHECK_FAILED",
      ],
    },

    actorId: {
      type: String,
      required: true,
      default: "SYSTEM",
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    previousHash: {
      type: String,
      default: null,
    },

    hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: "timestamp",
      updatedAt: false,
    },
    collection: "auditLogs",
  }
);

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ transactionId: 1, timestamp: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;

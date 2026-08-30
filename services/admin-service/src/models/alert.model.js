const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "INVARIANT_VIOLATION",
        "HIGH_FAILURE_RATE",
        "SUSPICIOUS_ACTIVITY",
        "SYSTEM_ERROR",
        "FX_PROVIDER_DOWN",
        "DATABASE_HIGH_CPU",
      ],
      index: true,
    },

    severity: {
      type: String,
      required: true,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
      default: "MEDIUM",
      index: true,
    },

    status: {
      type: String,
      required: true,
      enum: ["ACTIVE", "ACKNOWLEDGED", "RESOLVED"],
      default: "ACTIVE",
      index: true,
    },

    message: {
      type: String,
      required: true,
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    transactionId: {
      type: String,
      default: null,
      index: true,
    },

    acknowledgedBy: {
      type: String,
      default: null,
    },

    acknowledgedAt: {
      type: Date,
      default: null,
    },

    resolvedBy: {
      type: String,
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "alerts",
  }
);

alertSchema.index({ type: 1, severity: 1, status: 1 });
alertSchema.index({ status: 1, createdAt: -1 });

const Alert = mongoose.model("Alert", alertSchema);

module.exports = Alert;

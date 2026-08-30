// What is a Report Model?
// In your NovaPay Admin Service, a Report model would generally store generated reports or reporting records about the platform's activity.

// Think of it as:
// “Give the admin a summarized view of what happened in NovaPay during a certain period.”

// For example, an admin might want:
// Total transactions this month
// Total money transferred
// Number of failed transactions
// Number of disputes
// Number of KYC verifications
// Fees collected
// Suspicious/fraudulent activity
// User activity

const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["DAILY_SUMMARY", "COMPLIANCE", "AUDIT_TRAIL", "FINANCIAL"],
      index: true,
    },

    generatedBy: {
      type: String,
      required: true,
      trim: true,
    },

    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    status: {
      type: String,
      required: true,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },

    fileUrl: {
      type: String,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "reports",
  }
);

reportSchema.index({ type: 1, createdAt: -1 });
reportSchema.index({ generatedBy: 1, createdAt: -1 });

const Report = mongoose.model("Report", reportSchema);

module.exports = Report;

// What is an FX Quote?
// In your NovaPay system, FxQuote means Foreign Exchange Quote.
// It represents a temporary offer for converting one currency into another at a 
// specific exchange rate.

// It represents an exchange rate for a particular proposed transaction
// For example, a user wants to send:
// 100 USD → PKR

// NovaPay asks an FX provider for the current exchange rate and gets something like:

// 1 USD = 280.50 PKR

const mongoose = require("mongoose");

const fxQuoteSchema = new mongoose.Schema(
  {
    quoteId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    sourceCurrency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },

    targetCurrency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },

    sourceAmountMinor: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "sourceAmountMinor must be an integer",
      },
    },

    targetAmountMinor: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "targetAmountMinor must be an integer",
      },
    },

    rate: {
      type: Number,
      required: true,
      min: 0,
    },

    provider: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      required: true,
      enum: ["ACTIVE", "USED", "EXPIRED"],
      default: "ACTIVE",
      index: true,
    },

    usedByTransactionId: {
      type: String,
      default: null,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "fxQuotes",
  }
);

fxQuoteSchema.index({ sourceCurrency: 1, targetCurrency: 1, status: 1 });
fxQuoteSchema.index({ expiresAt: 1 });

const FxQuote = mongoose.model("FxQuote", fxQuoteSchema);

module.exports = FxQuote;

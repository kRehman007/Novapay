// FxRate stores the current/reference exchange rate obtained from an FX provider, 
// while FxQuote uses that rate to create a specific,
// temporary conversion offer for a particular amount and transaction.
// It is the current exchange rate between these two currencies
const mongoose = require("mongoose");

const fxRateSchema = new mongoose.Schema(
  {
    pair: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
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

    fetchedAt: {
      type: Date,
      required: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
    collection: "fxRates",
  }
);

fxRateSchema.index({ pair: 1, fetchedAt: -1 });

const FxRate = mongoose.model("FxRate", fxRateSchema);

module.exports = FxRate;

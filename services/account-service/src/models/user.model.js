const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      default: null,
      trim: true,
    },

    status: {
      type: String,
      required: true,
      enum: ["ACTIVE", "SUSPENDED", "CLOSED"],
      default: "ACTIVE",
      index: true,
    },

    kycStatus: {
      type: String,
      required: true,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    role: {
      type: String,
      required: true,
      enum: ["USER", "CORPORATE", "ADMIN"],
      default: "USER",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

userSchema.index({ status: 1, createdAt: -1 });

const User = mongoose.model("User", userSchema);

module.exports = User;

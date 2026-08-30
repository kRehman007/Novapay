// What is KYC?
// KYC = Know Your Customer.
// KYC is the process of verifying a customer's identity before allowing them to use certain financial services.
// Since you're building NovaPay, KYC is important because NovaPay deals with things like money transfers, wallets, payments, and a ledger. The system needs to know that a real person is behind an account.

// Simple example
// Suppose Ali creates a NovaPay account:

// Ali registers with his basic information.
// NovaPay asks Ali for an identity document.
// Ali uploads his CNIC / National ID.
// NovaPay stores the document information securely.
// An admin or verification service checks the document.
// If everything is valid → KYC = VERIFIED
// If something is wrong → KYC = REJECTED
// While waiting → KYC = PENDING


const mongoose = require("mongoose");

const kycRecordSchema = new mongoose.Schema(
  {
    kycId: {
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

    documentType: {
      type: String,
      required: true,
      enum: ["PASSPORT", "DRIVERS_LICENSE", "NATIONAL_ID", "UTILITY_BILL"],
    },

    documentNumberEncrypted: {
      type: String,
      required: true,
    },

    documentFrontUrl: {
      type: String,
      required: true,
    },

    documentBackUrl: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      required: true,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    rejectionReason: {
      type: String,
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    verifiedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "kycRecords",
  }
);

kycRecordSchema.index({ userId: 1, status: 1 });

const KycRecord = mongoose.model("KycRecord", kycRecordSchema);

module.exports = KycRecord;

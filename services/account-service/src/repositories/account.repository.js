const User = require("../models/user.model");
const Wallet = require("../models/wallet.model");
const KycRecord = require("../models/kycRecord.model");

class UserRepository {
  async create(userData) {
    const user = new User(userData);
    return await user.save();
  }

  async findById(userId) {
    return await User.findOne({ userId });
  }

  async findByEmail(email) {
    return await User.findOne({ email: email.toLowerCase() });
  }

  async update(userId, updateData) {
    return await User.findOneAndUpdate({ userId }, updateData, { new: true });
  }

  async updateStatus(userId, status) {
    return await User.findOneAndUpdate({ userId }, { status }, { new: true });
  }

  async updateKycStatus(userId, kycStatus) {
    return await User.findOneAndUpdate({ userId }, { kycStatus }, { new: true });
  }

  async findAll(filter = {}, options = {}) {
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

class WalletRepository {
  async create(walletData) {
    const wallet = new Wallet(walletData);
    return await wallet.save();
  }

  async findById(walletId) {
    return await Wallet.findOne({ walletId });
  }

  async findByUserAndCurrency(userId, currency) {
    return await Wallet.findOne({ userId, currency });
  }

  async findByUser(userId) {
    return await Wallet.find({ userId, status: { $ne: "CLOSED" } });
  }

  async updateBalance(walletId, amountMinor) {
    return await Wallet.findOneAndUpdate(
      { walletId },
      {
        $inc: { balanceCached: amountMinor },
        $set: { balanceUpdatedAt: new Date() },
      },
      { new: true }
    );
  }

  async setBalance(walletId, amountMinor) {
    return await Wallet.findOneAndUpdate(
      { walletId },
      {
        $set: { balanceCached: amountMinor, balanceUpdatedAt: new Date() },
      },
      { new: true }
    );
  }

  async updateStatus(walletId, status) {
    return await Wallet.findOneAndUpdate({ walletId }, { status }, { new: true });
  }

  async findAll(filter = {}) {
    return await Wallet.find(filter);
  }
}

class KycRepository {
  async create(kycData) {
    const kyc = new KycRecord(kycData);
    return await kyc.save();
  }

  async findById(kycId) {
    return await KycRecord.findOne({ kycId });
  }

  async findByUser(userId) {
    return await KycRecord.find({ userId }).sort({ createdAt: -1 });
  }

  async findLatestByUser(userId) {
    return await KycRecord.findOne({ userId }).sort({ createdAt: -1 });
  }

  async updateStatus(kycId, status, verifiedBy = null) {
    const update = { status };
    if (status === "VERIFIED") {
      update.verifiedAt = new Date();
      update.verifiedBy = verifiedBy;
    }
    if (status === "REJECTED") {
      update.rejectionReason = "Document verification failed";
    }
    return await KycRecord.findOneAndUpdate({ kycId }, update, { new: true });
  }
}

module.exports = {
  UserRepository,
  WalletRepository,
  KycRepository,
};

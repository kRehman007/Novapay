const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { UserRepository, WalletRepository, KycRepository } = require("../repositories/account.repository");
const { encrypt, decrypt } = require("../utils/encryption");
const { generateUserId, generateWalletId, generateKycId } = require("../utils/idGenerator");
const { getRedisClient } = require("../config/redis");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ component: "account-service" });

const SALT_ROUNDS = 12;
const CACHE_TTL = 300; // 5 minutes

class AccountService {
  constructor() {
    this.userRepo = new UserRepository();
    this.walletRepo = new WalletRepository();
    this.kycRepo = new KycRepository();
  }

  async createUser(inputData) {
    const { email, password, firstName, lastName, phone } = inputData;

    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      const error = new Error("Email already registered");
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const userId = generateUserId();
    const user = await this.userRepo.create({
      userId,
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone: phone || null,
      status: "ACTIVE",
      kycStatus: "PENDING",
      role: "USER",
    });

    logger.info("User created", { userId });

    const userData = {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      kycStatus: user.kycStatus,
      role: user.role,
    };

    const cacheKey = `user:${userId}`;
    const redis = getRedisClient();
    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(userData));
    }

    return userData;
  }

  async authenticateUser(email, password) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      const error = new Error("Invalid credentials");
      error.statusCode = 401;
      throw error;
    }

    if (user.status !== "ACTIVE") {
      const error = new Error("Account is not active");
      error.statusCode = 403;
      throw error;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      const error = new Error("Invalid credentials");
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    logger.info("User authenticated", { userId: user.userId });

    const userData = {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      status: user.status,
      kycStatus: user.kycStatus,
      role: user.role,
    };

    const cacheKey = `user:${user.userId}`;
    const redis = getRedisClient();
    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(userData));
    }

    return {
      token,
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async getUser(userId) {
    const cacheKey = `user:${userId}`;
    const redis = getRedisClient();

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const userData = {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      status: user.status,
      kycStatus: user.kycStatus,
      role: user.role,
    };

    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(userData));
    }

    return userData;
  }

  async updateUser(userId, updateData) {
    const allowedFields = ["firstName", "lastName", "phone"];
    const filteredUpdate = {};
    for (const key of Object.keys(updateData)) {
      if (allowedFields.includes(key)) {
        filteredUpdate[key] = updateData[key];
      }
    }

    const user = await this.userRepo.update(userId, filteredUpdate);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const userData = {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      status: user.status,
      kycStatus: user.kycStatus,
      role: user.role,
    };

    const cacheKey = `user:${userId}`;
    const redis = getRedisClient();
    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(userData));
    }

    logger.info("User updated", { userId });

    return userData;
  }

  async createWallet(userId, currency) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (user.status !== "ACTIVE") {
      const error = new Error("Account is not active");
      error.statusCode = 403;
      throw error;
    }

    const existingWallet = await this.walletRepo.findByUserAndCurrency(userId, currency.toUpperCase());
    if (existingWallet) {
      const error = new Error("Wallet already exists for this currency");
      error.statusCode = 409;
      throw error;
    }

    const walletId = generateWalletId();
    const wallet = await this.walletRepo.create({
      walletId,
      userId,
      accountType: "WALLET",
      currency: currency.toUpperCase(),
      status: "ACTIVE",
      balanceCached: 0,
    });

    logger.info("Wallet created", { userId, walletId, currency });

    const balanceCacheKey = `balance:${userId}:${currency.toUpperCase()}`;
    const redis = getRedisClient();
    if (redis) {
      await redis.setex(balanceCacheKey, CACHE_TTL, "0");
    }

    return {
      walletId: wallet.walletId,
      userId: wallet.userId,
      currency: wallet.currency,
      status: wallet.status,
      balanceCached: wallet.balanceCached,
    };
  }

  async getWallets(userId) {
    const wallets = await this.walletRepo.findByUser(userId);
    return wallets.map((w) => ({
      walletId: w.walletId,
      userId: w.userId,
      currency: w.currency,
      status: w.status,
      balanceCached: w.balanceCached,
    }));
  }

  async getBalance(userId, currency) {
    const cacheKey = `balance:${userId}:${currency}`;
    const redis = getRedisClient();

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        return { balance: parseInt(cached, 10) };
      }
    }

    const wallet = await this.walletRepo.findByUserAndCurrency(userId, currency.toUpperCase());
    if (!wallet) {
      const error = new Error("Wallet not found");
      error.statusCode = 404;
      throw error;
    }

    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL, wallet.balanceCached.toString());
    }

    return { balance: wallet.balanceCached };
  }

  async validateWallets(walletIds) {
    const wallets = await Promise.all(
      walletIds.map((id) => this.walletRepo.findById(id))
    );

    const valid = wallets.filter((w) => w && w.status === "ACTIVE");
    const invalid = walletIds.filter((id) => !valid.find((w) => w.walletId === id));

    return {
      valid: valid.map((w) => ({
        walletId: w.walletId,
        userId: w.userId,
        currency: w.currency,
      })),
      invalid,
    };
  }

  async freezeAccount(userId) {
    const user = await this.userRepo.updateStatus(userId, "SUSPENDED");
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const wallets = await this.walletRepo.findByUser(userId);
    await Promise.all(
      wallets.map((w) => this.walletRepo.updateStatus(w.walletId, "SUSPENDED"))
    );

    await this.invalidateUserCache(userId);

    for (const wallet of wallets) {
      await this.clearBalanceCache(userId, wallet.currency);
    }

    logger.info("Account frozen", { userId });

    return { userId, status: "SUSPENDED" };
  }

  async unfreezeAccount(userId) {
    const user = await this.userRepo.updateStatus(userId, "ACTIVE");
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const wallets = await this.walletRepo.findByUser(userId);
    await Promise.all(
      wallets.map((w) => this.walletRepo.updateStatus(w.walletId, "ACTIVE"))
    );

    await this.invalidateUserCache(userId);

    logger.info("Account unfrozen", { userId });

    return { userId, status: "ACTIVE" };
  }

  async submitKyc(userId, documentType, documentNumber, documentFrontUrl, documentBackUrl = null) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const kycId = generateKycId();
    const kyc = await this.kycRepo.create({
      kycId,
      userId,
      documentType,
      documentNumberEncrypted: encrypt(documentNumber),
      documentFrontUrl,
      documentBackUrl,
      status: "PENDING",
    });

    logger.info("KYC submitted", { userId, kycId });

    await this.userRepo.update(userId, { kycStatus: "PENDING" });

    const cacheKey = `user:${userId}`;
    const redis = getRedisClient();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const userData = JSON.parse(cached);
        userData.kycStatus = "PENDING";
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(userData));
      }
    }

    return {
      kycId: kyc.kycId,
      status: kyc.status,
      documentType: kyc.documentType,
    };
  }

  async getKycStatus(userId) {
    const kyc = await this.kycRepo.findLatestByUser(userId);
    if (!kyc) {
      return { status: "NOT_SUBMITTED" };
    }

    return {
      kycId: kyc.kycId,
      status: kyc.status,
      documentType: kyc.documentType,
      submittedAt: kyc.createdAt,
      verifiedAt: kyc.verifiedAt,
    };
  }

  async updateBalanceInCache(userId, currency, newBalance) {
    const cacheKey = `balance:${userId}:${currency}`;
    const redis = getRedisClient();
    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL, newBalance.toString());
    }
  }

  async clearBalanceCache(userId, currency) {
    const cacheKey = `balance:${userId}:${currency}`;
    const redis = getRedisClient();
    if (redis) {
      await redis.del(cacheKey);
    }
  }

  async invalidateUserCache(userId) {
    const cacheKey = `user:${userId}`;
    const redis = getRedisClient();
    if (redis) {
      await redis.del(cacheKey);
    }
  }

  async setUserCache(userId, userData) {
    const cacheKey = `user:${userId}`;
    const redis = getRedisClient();
    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(userData));
    }
  }

  async getUserCache(userId) {
    const cacheKey = `user:${userId}`;
    const redis = getRedisClient();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    return null;
  }
}

module.exports = new AccountService();

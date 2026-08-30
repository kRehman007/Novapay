const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const accountService = require("../services/account.services");
const { UserRepository, WalletRepository } = require("../repositories/account.repository");

// Set test environment variables BEFORE any imports that use them
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only";
process.env.ENCRYPTION_KEY = "1eb1d90f2f1cfe99812b98a8153a81b1";

jest.mock("../repositories/account.repository");
jest.mock("../config/redis", () => ({
  getRedisClient: () => null,
}));
jest.mock("../utils/logger", () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
}));

describe("AccountService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createUser", () => {
    it("should create a new user successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      };

      UserRepository.prototype.findByEmail.mockResolvedValue(null);
      UserRepository.prototype.create.mockResolvedValue({
        userId: "usr_test123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        status: "ACTIVE",
        kycStatus: "PENDING",
      });

      const result = await accountService.createUser(userData);

      expect(result).toHaveProperty("userId");
      expect(result.email).toBe("test@example.com");
      expect(UserRepository.prototype.create).toHaveBeenCalled();
    });

    it("should throw error if email already exists", async () => {
      const userData = {
        email: "existing@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      };

      UserRepository.prototype.findByEmail.mockResolvedValue({
        userId: "usr_existing",
        email: "existing@example.com",
      });

      await expect(accountService.createUser(userData)).rejects.toThrow(
        "Email already registered"
      );
    });
  });

  describe("authenticateUser", () => {
    it("should authenticate user and return token", async () => {
      const email = "test@example.com";
      const password = "password123";
      const passwordHash = await bcrypt.hash(password, 12);

      UserRepository.prototype.findByEmail.mockResolvedValue({
        userId: "usr_test123",
        email,
        passwordHash,
        firstName: "John",
        lastName: "Doe",
        role: "USER",
        status: "ACTIVE",
      });

      const result = await accountService.authenticateUser(email, password);

      expect(result).toHaveProperty("token");
      expect(result.user).toHaveProperty("userId");
      expect(result.user.email).toBe(email);
    });

    it("should throw error for invalid credentials", async () => {
      UserRepository.prototype.findByEmail.mockResolvedValue(null);

      await expect(
        accountService.authenticateUser("wrong@example.com", "password")
      ).rejects.toThrow("Invalid credentials");
    });

    it("should throw error for inactive account", async () => {
      const passwordHash = await bcrypt.hash("password123", 12);

      UserRepository.prototype.findByEmail.mockResolvedValue({
        userId: "usr_test123",
        email: "test@example.com",
        passwordHash,
        status: "SUSPENDED",
      });

      await expect(
        accountService.authenticateUser("test@example.com", "password123")
      ).rejects.toThrow("Account is not active");
    });
  });

  describe("createWallet", () => {
    it("should create a wallet successfully", async () => {
      UserRepository.prototype.findById.mockResolvedValue({
        userId: "usr_test123",
        status: "ACTIVE",
      });

      WalletRepository.prototype.findByUserAndCurrency.mockResolvedValue(null);
      WalletRepository.prototype.create.mockResolvedValue({
        walletId: "wal_test123",
        userId: "usr_test123",
        currency: "USD",
        status: "ACTIVE",
        balanceCached: 0,
      });

      const result = await accountService.createWallet("usr_test123", "USD");

      expect(result).toHaveProperty("walletId");
      expect(result.currency).toBe("USD");
    });

    it("should throw error if wallet already exists", async () => {
      UserRepository.prototype.findById.mockResolvedValue({
        userId: "usr_test123",
        status: "ACTIVE",
      });

      WalletRepository.prototype.findByUserAndCurrency.mockResolvedValue({
        walletId: "wal_existing",
        currency: "USD",
      });

      await expect(
        accountService.createWallet("usr_test123", "USD")
      ).rejects.toThrow("Wallet already exists for this currency");
    });

    it("should throw error if user not found", async () => {
      UserRepository.prototype.findById.mockResolvedValue(null);

      await expect(
        accountService.createWallet("usr_nonexistent", "USD")
      ).rejects.toThrow("User not found");
    });
  });

  describe("getBalance", () => {
    it("should return balance for wallet", async () => {
      WalletRepository.prototype.findByUserAndCurrency.mockResolvedValue({
        walletId: "wal_test123",
        balanceCached: 5000,
      });

      const result = await accountService.getBalance("usr_test123", "USD");

      expect(result.balance).toBe(5000);
    });

    it("should throw error if wallet not found", async () => {
      WalletRepository.prototype.findByUserAndCurrency.mockResolvedValue(null);

      await expect(
        accountService.getBalance("usr_test123", "USD")
      ).rejects.toThrow("Wallet not found");
    });
  });

  describe("validateWallets", () => {
    it("should validate multiple wallets", async () => {
      WalletRepository.prototype.findById
        .mockResolvedValueOnce({
          walletId: "wal_valid",
          userId: "usr_test123",
          currency: "USD",
          status: "ACTIVE",
        })
        .mockResolvedValueOnce(null);

      const result = await accountService.validateWallets([
        "wal_valid",
        "wal_invalid",
      ]);

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0]).toBe("wal_invalid");
    });
  });

  describe("freezeAccount", () => {
    it("should freeze account and all wallets", async () => {
      UserRepository.prototype.updateStatus.mockResolvedValue({
        userId: "usr_test123",
        status: "SUSPENDED",
      });

      WalletRepository.prototype.findByUser.mockResolvedValue([
        { walletId: "wal_1", status: "ACTIVE" },
        { walletId: "wal_2", status: "ACTIVE" },
      ]);

      WalletRepository.prototype.updateStatus.mockResolvedValue({
        status: "SUSPENDED",
      });

      const result = await accountService.freezeAccount("usr_test123");

      expect(result.status).toBe("SUSPENDED");
      expect(WalletRepository.prototype.updateStatus).toHaveBeenCalledTimes(2);
    });
  });
});

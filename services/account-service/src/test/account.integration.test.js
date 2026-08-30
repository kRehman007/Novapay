const request = require("supertest");
const app = require("../app");
const { UserRepository, WalletRepository } = require("../repositories/account.repository");

// Set test environment variables BEFORE any imports that use them
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only";
process.env.ENCRYPTION_KEY = "1eb1d90f2f1cfe99812b98a8153a81b1";
process.env.SERVICE_KEY = "test-service-key";

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

describe("Account Service API", () => {
  let authToken;
  let userId;
  let walletId;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Health Check", () => {
    it("GET /health should return healthy", async () => {
      const res = await request(app).get("/health").expect(200);

      expect(res.body.status).toBe("healthy");
      expect(res.body.service).toBe("account-service");
    });
  });

  describe("POST /api/accounts", () => {
    it("should create a new user", async () => {
      UserRepository.prototype.findByEmail.mockResolvedValue(null);
      UserRepository.prototype.create.mockResolvedValue({
        userId: "usr_test123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        status: "ACTIVE",
        kycStatus: "PENDING",
        role: "USER",
      });

      const res = await request(app)
        .post("/api/accounts")
        .send({
          email: "test@example.com",
          password: "password123",
          firstName: "John",
          lastName: "Doe",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("userId");
      expect(res.body.data.email).toBe("test@example.com");
    });

    it("should return 400 for missing fields", async () => {
      const res = await request(app)
        .post("/api/accounts")
        .send({ email: "test@example.com" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should return 409 for duplicate email", async () => {
      UserRepository.prototype.findByEmail.mockResolvedValue({
        userId: "usr_existing",
        email: "test@example.com",
      });

      const res = await request(app)
        .post("/api/accounts")
        .send({
          email: "test@example.com",
          password: "password123",
          firstName: "John",
          lastName: "Doe",
        })
        .expect(409);

      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/accounts/auth", () => {
    it("should authenticate and return token", async () => {
      const bcrypt = require("bcryptjs");
      const passwordHash = await bcrypt.hash("password123", 12);

      UserRepository.prototype.findByEmail.mockResolvedValue({
        userId: "usr_test123",
        email: "test@example.com",
        passwordHash,
        firstName: "John",
        lastName: "Doe",
        role: "USER",
        status: "ACTIVE",
      });

      const res = await request(app)
        .post("/api/accounts/auth")
        .send({
          email: "test@example.com",
          password: "password123",
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("token");
      authToken = res.body.data.token;
      userId = res.body.data.user.userId;
    });

    it("should return 401 for wrong password", async () => {
      UserRepository.prototype.findByEmail.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/accounts/auth")
        .send({
          email: "wrong@example.com",
          password: "wrongpassword",
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/accounts/:userId", () => {
    it("should return user profile", async () => {
      UserRepository.prototype.findById.mockResolvedValue({
        userId: "usr_test123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        phone: null,
        status: "ACTIVE",
        kycStatus: "PENDING",
        role: "USER",
      });

      const res = await request(app)
        .get("/api/accounts/usr_test123")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe("usr_test123");
    });

    it("should return 401 without token", async () => {
      await request(app)
        .get("/api/accounts/usr_test123")
        .expect(401);
    });
  });

  describe("POST /api/accounts/:userId/wallets", () => {
    it("should create a wallet", async () => {
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

      const res = await request(app)
        .post("/api/accounts/usr_test123/wallets")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ currency: "USD" })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("walletId");
      walletId = res.body.data.walletId;
    });

    it("should return 409 for duplicate wallet", async () => {
      UserRepository.prototype.findById.mockResolvedValue({
        userId: "usr_test123",
        status: "ACTIVE",
      });
      WalletRepository.prototype.findByUserAndCurrency.mockResolvedValue({
        walletId: "wal_existing",
        currency: "USD",
      });

      await request(app)
        .post("/api/accounts/usr_test123/wallets")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ currency: "USD" })
        .expect(409);
    });
  });

  describe("GET /api/accounts/:userId/balance", () => {
    it("should return balance", async () => {
      WalletRepository.prototype.findByUserAndCurrency.mockResolvedValue({
        walletId: "wal_test123",
        balanceCached: 5000,
      });

      const res = await request(app)
        .get("/api/accounts/usr_test123/balance?currency=USD")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.balance).toBe(5000);
    });

    it("should return 400 without currency", async () => {
      await request(app)
        .get("/api/accounts/usr_test123/balance")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe("POST /api/accounts/validate", () => {
    it("should validate wallets (service-to-service)", async () => {
      WalletRepository.prototype.findById
        .mockResolvedValueOnce({
          walletId: "wal_valid",
          userId: "usr_test123",
          currency: "USD",
          status: "ACTIVE",
        })
        .mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/accounts/validate")
        .set("X-Service-Key", "test-service-key")
        .send({ walletIds: ["wal_valid", "wal_invalid"] })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toHaveLength(1);
      expect(res.body.data.invalid).toHaveLength(1);
    });
  });

  describe("PUT /api/accounts/:userId/freeze", () => {
    it("should freeze account", async () => {
      UserRepository.prototype.updateStatus.mockResolvedValue({
        userId: "usr_test123",
        status: "SUSPENDED",
      });
      WalletRepository.prototype.findByUser.mockResolvedValue([]);
      UserRepository.prototype.findById.mockResolvedValue({
        userId: "usr_test123",
        status: "SUSPENDED",
      });

      const res = await request(app)
        .put("/api/accounts/usr_test123/freeze")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("SUSPENDED");
    });
  });

  describe("404 Handler", () => {
    it("should return 404 for unknown routes", async () => {
      await request(app)
        .get("/api/unknown")
        .expect(404);
    });
  });
});

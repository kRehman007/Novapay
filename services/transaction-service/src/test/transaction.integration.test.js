const request = require("supertest");
const app = require("../app");
const { TransactionRepository, IdempotencyKeyRepository } = require("../repositories/transaction.repository");

// Set test environment variables BEFORE any imports that use them
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only";
process.env.SERVICE_KEY = "test-service-key";
process.env.ACCOUNT_SERVICE_URL = "http://localhost:4001";
process.env.LEDGER_SERVICE_URL = "http://localhost:4003";
process.env.FX_SERVICE_URL = "http://localhost:4004";

jest.mock("../repositories/transaction.repository");
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
jest.mock("axios");

describe("Transaction Service API", () => {
  let authToken;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock JWT verification for protected routes
    const jwt = require("jsonwebtoken");
    authToken = jwt.sign(
      { userId: "usr_test123", email: "test@example.com", role: "USER" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  describe("Health Check", () => {
    it("GET /health should return healthy", async () => {
      const res = await request(app).get("/health").expect(200);

      expect(res.body.status).toBe("healthy");
      expect(res.body.service).toBe("transaction-service");
    });
  });

  describe("GET /api/transfers/:id", () => {
    it("should return transaction by ID", async () => {
      TransactionRepository.prototype.findById.mockResolvedValue({
        transactionId: "txn_test123",
        status: "COMPLETED",
        amountMinor: 5000,
        currency: "USD",
      });

      const res = await request(app)
        .get("/api/transfers/txn_test123")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.transactionId).toBe("txn_test123");
    });

    it("should return 404 for non-existent transaction", async () => {
      TransactionRepository.prototype.findById.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/transfers/txn_nonexistent")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it("should return 401 without token", async () => {
      await request(app)
        .get("/api/transfers/txn_test123")
        .expect(401);
    });
  });

  describe("POST /api/transfers/domestic", () => {
    it("should return 400 for missing fields", async () => {
      const res = await request(app)
        .post("/api/transfers/domestic")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ senderWalletId: "wal_1" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should return 401 without token", async () => {
      await request(app)
        .post("/api/transfers/domestic")
        .send({})
        .expect(401);
    });
  });

  describe("GET /api/transfers/user/:userId", () => {
    it("should return user transactions", async () => {
      TransactionRepository.prototype.findByUser.mockResolvedValue({
        transactions: [
          { transactionId: "txn_1", status: "COMPLETED" },
          { transactionId: "txn_2", status: "PENDING" },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const res = await request(app)
        .get("/api/transfers/user/usr_test123")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.transactions).toHaveLength(2);
    });
  });

  describe("POST /api/transfers/:id/reverse", () => {
    it("should return 404 for non-existent transaction", async () => {
      TransactionRepository.prototype.findById.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/transfers/txn_nonexistent/reverse")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ reason: "test" })
        .expect(404);

      expect(res.body.success).toBe(false);
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

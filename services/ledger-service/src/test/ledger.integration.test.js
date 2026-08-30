require("dotenv").config();
process.env.SERVICE_KEY = "test-service-key";

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

const SERVICE_KEY = "test-service-key";

describe("Ledger Service API", () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/novapay_ledger_test?replicaSet=rs0";
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe("Health Check", () => {
    it("GET /health should return healthy", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.service).toBe("ledger-service");
    });
  });

  describe("Service Authentication", () => {
    it("should return 403 without service key", async () => {
      const res = await request(app).get("/api/ledger/transactions");
      expect(res.status).toBe(403);
    });

    it("should return 403 with invalid service key", async () => {
      const res = await request(app)
        .get("/api/ledger/transactions")
        .set("X-Service-Key", "invalid-key");
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/ledger/entries", () => {
    it("should create balanced double-entry ledger entries", async () => {
      const res = await request(app)
        .post("/api/ledger/entries")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          transactionId: "txn_integration_test1",
          type: "TRANSFER",
          entries: [
            { accountId: "wal_sender", entryType: "DEBIT", amountMinor: 10000, currency: "USD" },
            { accountId: "wal_receiver", entryType: "CREDIT", amountMinor: 10000, currency: "USD" },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("COMPLETED");
      expect(res.body.data.isInvariantBalanced).toBe(true);
    });

    it("should return 400 for unbalanced entries", async () => {
      const res = await request(app)
        .post("/api/ledger/entries")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          transactionId: "txn_integration_test2",
          type: "TRANSFER",
          entries: [
            { accountId: "wal_1", entryType: "DEBIT", amountMinor: 10000, currency: "USD" },
            { accountId: "wal_2", entryType: "CREDIT", amountMinor: 5000, currency: "USD" },
          ],
        });

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing transactionId", async () => {
      const res = await request(app)
        .post("/api/ledger/entries")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          type: "TRANSFER",
          entries: [
            { accountId: "wal_1", entryType: "DEBIT", amountMinor: 10000, currency: "USD" },
            { accountId: "wal_2", entryType: "CREDIT", amountMinor: 10000, currency: "USD" },
          ],
        });

      expect(res.status).toBe(400);
    });

    it("should return 400 for less than 2 entries", async () => {
      const res = await request(app)
        .post("/api/ledger/entries")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          transactionId: "txn_integration_test3",
          type: "TRANSFER",
          entries: [{ accountId: "wal_1", entryType: "DEBIT", amountMinor: 10000, currency: "USD" }],
        });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/ledger/entries/:transactionId", () => {
    it("should return entries for a transaction", async () => {
      await request(app)
        .post("/api/ledger/entries")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          transactionId: "txn_integration_test4",
          type: "TRANSFER",
          entries: [
            { accountId: "wal_a", entryType: "DEBIT", amountMinor: 5000, currency: "USD" },
            { accountId: "wal_b", entryType: "CREDIT", amountMinor: 5000, currency: "USD" },
          ],
        });

      const res = await request(app)
        .get("/api/ledger/entries/txn_integration_test4")
        .set("X-Service-Key", SERVICE_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("GET /api/ledger/account/:accountId/balance", () => {
    it("should return account balance", async () => {
      const res = await request(app)
        .get("/api/ledger/account/wal_sender/balance")
        .set("X-Service-Key", SERVICE_KEY)
        .query({ currency: "USD" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("balance");
    });

    it("should return 400 without currency", async () => {
      const res = await request(app)
        .get("/api/ledger/account/wal_sender/balance")
        .set("X-Service-Key", SERVICE_KEY);

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/ledger/integrity", () => {
    it("should verify audit log integrity", async () => {
      const res = await request(app)
        .get("/api/ledger/integrity")
        .set("X-Service-Key", SERVICE_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("valid");
    });
  });

  describe("404 Handler", () => {
    it("should return 404 for unknown routes", async () => {
      const res = await request(app).get("/api/unknown");
      expect(res.status).toBe(404);
    });
  });
});

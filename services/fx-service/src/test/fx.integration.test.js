require("dotenv").config();
process.env.SERVICE_KEY = "7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH";

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

const SERVICE_KEY = "7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH";

describe("FX Service API", () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/novapay_fx_test?replicaSet=rs0";
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
      expect(res.body.service).toBe("fx-service");
    });
  });

  describe("Service Authentication", () => {
    it("should return 403 without service key", async () => {
      const res = await request(app).get("/api/fx/rate/USD/EUR");
      expect(res.status).toBe(403);
    });

    it("should return 403 with invalid service key", async () => {
      const res = await request(app)
        .get("/api/fx/rate/USD/EUR")
        .set("X-Service-Key", "invalid-key");
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/fx/rate/:source/:target", () => {
    it("should return exchange rate", async () => {
      const res = await request(app)
        .get("/api/fx/rate/USD/EUR")
        .set("X-Service-Key", SERVICE_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pair).toBe("USDEUR");
      expect(res.body.data.rate).toBeGreaterThan(0);
    });
  });

  describe("POST /api/fx/quote", () => {
    it("should create an FX quote", async () => {
      const res = await request(app)
        .post("/api/fx/quote")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          sourceCurrency: "USD",
          targetCurrency: "EUR",
          sourceAmountMinor: 10000,
          userId: "usr_test",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quoteId).toBeDefined();
      expect(res.body.data.status).toBe("ACTIVE");
    });

    it("should return 400 for same currencies", async () => {
      const res = await request(app)
        .post("/api/fx/quote")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          sourceCurrency: "USD",
          targetCurrency: "USD",
          sourceAmountMinor: 10000,
        });

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing fields", async () => {
      const res = await request(app)
        .post("/api/fx/quote")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          sourceCurrency: "USD",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("404 Handler", () => {
    it("should return 404 for unknown routes", async () => {
      const res = await request(app).get("/api/unknown");
      expect(res.status).toBe(404);
    });
  });
});

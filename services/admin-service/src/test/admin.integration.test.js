require("dotenv").config();
process.env.SERVICE_KEY = "7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH";

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

const SERVICE_KEY = "7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH";

describe("Admin Service API", () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/novapay_admin_test?replicaSet=rs0";
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
      expect(res.body.service).toBe("admin-service");
    });
  });

  describe("Service Authentication", () => {
    it("should return 403 without service key", async () => {
      const res = await request(app).get("/api/admin/dashboard");
      expect(res.status).toBe(403);
    });

    it("should return 403 with invalid service key", async () => {
      const res = await request(app)
        .get("/api/admin/dashboard")
        .set("X-Service-Key", "invalid-key");
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/admin/dashboard", () => {
    it("should return dashboard stats", async () => {
      const res = await request(app)
        .get("/api/admin/dashboard")
        .set("X-Service-Key", SERVICE_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.disputes).toBeDefined();
      expect(res.body.data.alerts).toBeDefined();
    });
  });

  describe("POST /api/admin/disputes", () => {
    it("should create a dispute", async () => {
      const res = await request(app)
        .post("/api/admin/disputes")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          transactionId: "txn_test123",
          userId: "usr_test",
          type: "DUPLICATE_CHARGE",
          description: "Charged twice for same payment",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("OPEN");
    });

    it("should return 400 for missing fields", async () => {
      const res = await request(app)
        .post("/api/admin/disputes")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          transactionId: "txn_test",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/admin/disputes", () => {
    it("should return disputes list", async () => {
      const res = await request(app)
        .get("/api/admin/disputes")
        .set("X-Service-Key", SERVICE_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("POST /api/admin/alerts", () => {
    it("should create an alert", async () => {
      const res = await request(app)
        .post("/api/admin/alerts")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          type: "INVARIANT_VIOLATION",
          severity: "CRITICAL",
          message: "Debit != Credit detected",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("ACTIVE");
    });

    it("should return 400 for missing fields", async () => {
      const res = await request(app)
        .post("/api/admin/alerts")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          type: "SYSTEM_ERROR",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/admin/reports", () => {
    it("should generate a report", async () => {
      const res = await request(app)
        .post("/api/admin/reports")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          type: "DAILY_SUMMARY",
          generatedBy: "admin",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("COMPLETED");
    });

    it("should return 400 for missing fields", async () => {
      const res = await request(app)
        .post("/api/admin/reports")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          type: "COMPLIANCE",
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

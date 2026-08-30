require("dotenv").config();
process.env.SERVICE_KEY = "7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH";

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

const SERVICE_KEY = "7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH";

describe("Payroll Service API", () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/novapay_payroll_test?replicaSet=rs0";
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
      expect(res.body.service).toBe("payroll-service");
    });
  });

  describe("Service Authentication", () => {
    it("should return 403 without service key", async () => {
      const res = await request(app).get("/api/payroll/batches");
      expect(res.status).toBe(403);
    });

    it("should return 403 with invalid service key", async () => {
      const res = await request(app)
        .get("/api/payroll/batches")
        .set("X-Service-Key", "invalid-key");
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/payroll/batches", () => {
    it("should create a payroll batch", async () => {
      const res = await request(app)
        .post("/api/payroll/batches")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          employerId: "usr_employer",
          employerWalletId: "wal_employer",
          name: "August Salaries",
          currency: "PKR",
          idempotencyKey: "iky_test1",
          items: [
            { employeeId: "usr_emp1", employeeWalletId: "wal_emp1", amountMinor: 50000 },
            { employeeId: "usr_emp2", employeeWalletId: "wal_emp2", amountMinor: 60000 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalItems).toBe(2);
      expect(res.body.data.totalAmountMinor).toBe(110000);
    });

    it("should return 400 for empty items", async () => {
      const res = await request(app)
        .post("/api/payroll/batches")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          employerId: "usr_employer",
          employerWalletId: "wal_employer",
          name: "Test",
          currency: "PKR",
          idempotencyKey: "iky_test2",
          items: [],
        });

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing fields", async () => {
      const res = await request(app)
        .post("/api/payroll/batches")
        .set("X-Service-Key", SERVICE_KEY)
        .send({
          employerId: "usr_employer",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/payroll/batches/:batchId", () => {
    it("should return 404 for non-existent batch", async () => {
      const res = await request(app)
        .get("/api/payroll/batches/bat_nonexistent")
        .set("X-Service-Key", SERVICE_KEY);

      expect(res.status).toBe(404);
    });
  });

  describe("404 Handler", () => {
    it("should return 404 for unknown routes", async () => {
      const res = await request(app).get("/api/unknown");
      expect(res.status).toBe(404);
    });
  });
});

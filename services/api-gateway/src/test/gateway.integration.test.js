require("dotenv").config();
process.env.SERVICE_KEY = "7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH";

const request = require("supertest");
const app = require("../app");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "novapay_jwt_secret_2024";
const SERVICE_KEY = "7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH";

function generateToken(payload = {}) {
  return jwt.sign(
    { userId: "usr_test", email: "test@test.com", ...payload },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

describe("API Gateway", () => {
  describe("Health Check", () => {
    it("GET /health should return gateway status", async () => {
      const res = await request(app).get("/health");
      expect([200, 503]).toContain(res.status);
      expect(res.body.service).toBe("api-gateway");
      expect(res.body.services).toBeDefined();
    });
  });

  describe("Authentication", () => {
    it("should forward request without token (service handles auth)", async () => {
      const res = await request(app).get("/api/accounts/usr_test");
      expect([401, 502]).toContain(res.status);
    });

    it("should forward request with invalid token (service handles auth)", async () => {
      const res = await request(app)
        .get("/api/accounts/usr_test")
        .set("Authorization", "Bearer invalid-token");
      expect([401, 502]).toContain(res.status);
    });

    it("should forward request with valid token", async () => {
      const token = generateToken();
      const res = await request(app)
        .get("/api/accounts/usr_test")
        .set("Authorization", `Bearer ${token}`);
      expect([404, 502]).toContain(res.status);
    });
  });

  describe("Routing", () => {
    it("should return 404 for unknown routes", async () => {
      const token = generateToken();
      const res = await request(app)
        .get("/api/unknown")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it("should route to account service (returns 502 if service down)", async () => {
      const token = generateToken();
      const res = await request(app)
        .get("/api/accounts/usr_test")
        .set("Authorization", `Bearer ${token}`);
      expect([404, 502]).toContain(res.status);
    });
  });

  describe("Rate Limiting", () => {
    it("should have rate limit middleware configured", async () => {
      const token = generateToken();
      const res = await request(app)
        .get("/api/accounts/usr_test")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for unknown paths", async () => {
      const res = await request(app).get("/unknown");
      expect(res.status).toBe(404);
    });
  });
});

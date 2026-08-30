const { SERVICES, getServiceForPath } = require("../services/gateway.service");

describe("GatewayService", () => {
  describe("getServiceForPath", () => {
    it("should route account service paths", () => {
      const result = getServiceForPath("/api/accounts");
      expect(result).not.toBeNull();
      expect(result.url).toContain("4001");
    });

    it("should route transaction service paths", () => {
      const result = getServiceForPath("/api/transfers");
      expect(result).not.toBeNull();
      expect(result.url).toContain("4002");
    });

    it("should route ledger service paths", () => {
      const result = getServiceForPath("/api/ledger");
      expect(result).not.toBeNull();
      expect(result.url).toContain("4003");
    });

    it("should route fx service paths", () => {
      const result = getServiceForPath("/api/fx");
      expect(result).not.toBeNull();
      expect(result.url).toContain("4004");
    });

    it("should route payroll service paths", () => {
      const result = getServiceForPath("/api/payroll");
      expect(result).not.toBeNull();
      expect(result.url).toContain("4005");
    });

    it("should route admin service paths", () => {
      const result = getServiceForPath("/api/admin");
      expect(result).not.toBeNull();
      expect(result.url).toContain("4006");
    });

    it("should return null for unknown paths", () => {
      const result = getServiceForPath("/api/unknown");
      expect(result).toBeNull();
    });

    it("should return null for root path", () => {
      const result = getServiceForPath("/");
      expect(result).toBeNull();
    });
  });

  describe("SERVICES", () => {
    it("should have all 6 services configured", () => {
      expect(Object.keys(SERVICES)).toHaveLength(6);
    });

    it("each service should have url and routes", () => {
      for (const service of Object.values(SERVICES)) {
        expect(service.url).toBeDefined();
        expect(service.routes).toBeDefined();
        expect(Array.isArray(service.routes)).toBe(true);
      }
    });
  });
});

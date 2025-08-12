const http = require("node:http");
const { spawn } = require("node:child_process");
const path = require("node:path");

describe("Working API Integration Tests", () => {
  let serverProcess;
  const API_BASE_URL = "http://localhost:3001/api";
  const TEST_INSTRUCTOR_ID = "123ed673-79ac-41d6-81da-79de6829be4a";

  beforeAll(async () => {
    // Start the working API server
    const serverPath = path.join(__dirname, "../working-api.js");
    serverProcess = spawn("node", [serverPath], {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test" },
    });

    // Wait for server to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Server startup timeout"));
      }, 10000);

      serverProcess.stdout.on("data", (data) => {
        if (data.toString().includes("DriveFlow API running")) {
          clearTimeout(timeout);
          resolve();
        }
      });

      serverProcess.stderr.on("data", (data) => {
        console.error("Server stderr:", data.toString());
      });
    });

    // Wait a bit more for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  });

  describe("Health Check Endpoint", () => {
    test("GET /api/health should return server status", async () => {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        status: "ok",
        message: "DriveFlow API is working!",
        timestamp: expect.any(String),
      });
    });
  });

  describe("Payout Readiness Endpoint", () => {
    test("GET /api/payments/instructors/:id/payout-readiness should return instructor status", async () => {
      const response = await fetch(
        `${API_BASE_URL}/payments/instructors/${TEST_INSTRUCTOR_ID}/payout-readiness`,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        status: "Not Started",
        requirements: expect.arrayContaining([
          expect.stringContaining("Stripe account"),
        ]),
      });
    });

    test("should handle different instructor IDs", async () => {
      const testId = "different-instructor-id";
      const response = await fetch(
        `${API_BASE_URL}/payments/instructors/${testId}/payout-readiness`,
      );

      expect(response.status).toBe(200);
      // Should return same mock data regardless of ID
      const data = await response.json();
      expect(data.status).toBe("Not Started");
    });
  });

  describe("Stripe Connect Link Endpoint", () => {
    test("GET /api/payments/instructors/:id/stripe/connect-link should return onboarding link", async () => {
      const response = await fetch(
        `${API_BASE_URL}/payments/instructors/${TEST_INSTRUCTOR_ID}/stripe/connect-link`,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("onboardingLink");
      expect(data.onboardingLink).toMatch(
        /^https:\/\/connect\.stripe\.com\/express\/onboarding/,
      );

      // Verify return URL parameters are included
      expect(data.onboardingLink).toContain("return_url=");
      expect(data.onboardingLink).toContain("refresh_url=");
      expect(data.onboardingLink).toContain(
        `instructor_id=${TEST_INSTRUCTOR_ID}`,
      );
    });

    test("should include correct return URLs", async () => {
      const response = await fetch(
        `${API_BASE_URL}/payments/instructors/${TEST_INSTRUCTOR_ID}/stripe/connect-link`,
      );
      const data = await response.json();

      const url = new URL(data.onboardingLink);
      const returnUrl = decodeURIComponent(url.searchParams.get("return_url"));
      const refreshUrl = decodeURIComponent(
        url.searchParams.get("refresh_url"),
      );

      expect(returnUrl).toContain("stripe_onboarding=success");
      expect(refreshUrl).toContain("stripe_onboarding=refresh");
      expect(returnUrl).toContain(TEST_INSTRUCTOR_ID);
    });
  });

  describe("CORS Headers", () => {
    test("should include CORS headers in responses", async () => {
      const response = await fetch(`${API_BASE_URL}/health`);

      expect(response.headers.get("access-control-allow-origin")).toBe("*");
      expect(response.headers.get("access-control-allow-methods")).toContain(
        "GET",
      );
    });

    test("should handle OPTIONS requests", async () => {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "OPTIONS",
      });

      expect(response.status).toBe(200);
    });
  });

  describe("Error Handling", () => {
    test("should return 404 for unknown routes", async () => {
      const response = await fetch(`${API_BASE_URL}/unknown-route`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toMatchObject({
        message: expect.stringContaining("Cannot GET"),
        error: "Not Found",
        statusCode: 404,
      });
    });

    test("should handle malformed instructor IDs gracefully", async () => {
      const response = await fetch(
        `${API_BASE_URL}/payments/instructors/invalid-id/payout-readiness`,
      );

      // Should still work with mock implementation
      expect(response.status).toBe(200);
    });
  });

  describe("Response Format", () => {
    test("all responses should be valid JSON", async () => {
      const endpoints = [
        "/health",
        `/payments/instructors/${TEST_INSTRUCTOR_ID}/payout-readiness`,
        `/payments/instructors/${TEST_INSTRUCTOR_ID}/stripe/connect-link`,
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        expect(response.headers.get("content-type")).toContain(
          "application/json",
        );

        // Should parse without throwing
        const data = await response.json();
        expect(typeof data).toBe("object");
      }
    });
  });
});

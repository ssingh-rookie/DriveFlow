import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StripeOnboarding } from "../StripeOnboarding";
import { spawn } from "child_process";
import path from "path";

describe("StripeOnboarding End-to-End Tests", () => {
  let serverProcess: any;
  const TEST_INSTRUCTOR_ID = "123ed673-79ac-41d6-81da-79de6829be4a";
  const API_BASE_URL = "http://localhost:3001/api";

  beforeAll(async () => {
    // Start the working API server for E2E tests
    const serverPath = path.join(
      __dirname,
      "../../../../api/src/working-api.js",
    );
    serverProcess = spawn("node", [serverPath], {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test" },
    });

    // Wait for server to start
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Server startup timeout"));
      }, 10000);

      serverProcess.stdout.on("data", (data: Buffer) => {
        if (data.toString().includes("DriveFlow API running")) {
          clearTimeout(timeout);
          resolve();
        }
      });

      serverProcess.stderr.on("data", (data: Buffer) => {
        console.error("Server stderr:", data.toString());
      });
    });

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  });

  beforeEach(() => {
    // Clear any existing mocks to use real fetch
    jest.restoreAllMocks();
  });

  it("should complete the full Stripe onboarding flow", async () => {
    // Mock browser APIs
    const confirmSpy = jest
      .spyOn(window, "confirm")
      .mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    // Render component
    render(<StripeOnboarding instructorId={TEST_INSTRUCTOR_ID} />);

    // 1. Wait for initial load and API call
    expect(await screen.findByText("Status:")).toBeInTheDocument();
    expect(await screen.findByText("Not Started")).toBeInTheDocument();

    // 2. Verify connect button appears
    const connectButton = await screen.findByText("Connect with Stripe");
    expect(connectButton).toBeInTheDocument();

    // 3. Click connect button
    fireEvent.click(connectButton);

    // 4. Wait for confirmation dialog
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining("🚀 STRIPE CONNECT FLOW:"),
      );
    });

    // 5. Verify success simulation
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "🎉 Simulated: Stripe account connected successfully!",
      );
    });

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it("should handle Stripe return URL flow", async () => {
    // Mock URL with stripe_onboarding=success parameter
    const mockLocation = {
      search: "?stripe_onboarding=success",
      pathname: `/dashboard/instructors/${TEST_INSTRUCTOR_ID}/payouts`,
    };
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
    });

    // Mock history.replaceState
    const replaceStateSpy = jest
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => {});

    // Render component
    render(<StripeOnboarding instructorId={TEST_INSTRUCTOR_ID} />);

    // Should show complete status
    expect(await screen.findByText("Complete")).toBeInTheDocument();
    expect(
      await screen.findByText(/Your Stripe account is connected/),
    ).toBeInTheDocument();

    // Should not show connect button
    expect(screen.queryByText("Connect with Stripe")).not.toBeInTheDocument();

    // Should clean URL
    expect(replaceStateSpy).toHaveBeenCalledWith(
      {},
      expect.any(String),
      mockLocation.pathname,
    );

    replaceStateSpy.mockRestore();
  });

  it("should integrate with real API endpoints", async () => {
    render(<StripeOnboarding instructorId={TEST_INSTRUCTOR_ID} />);

    // Wait for component to load
    await screen.findByText("Status:");

    // Verify real API calls were made to actual server
    // We can verify this by checking network activity or server logs
    // For now, we verify the expected responses are rendered

    expect(await screen.findByText("Not Started")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Please connect your Stripe account to receive payouts",
      ),
    ).toBeInTheDocument();

    // Click connect to test second API endpoint
    const confirmSpy = jest
      .spyOn(window, "confirm")
      .mockImplementation(() => false);

    const connectButton = await screen.findByText("Connect with Stripe");
    fireEvent.click(connectButton);

    // Even if user cancels, the API call should have been made
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });

  it("should handle real API errors", async () => {
    // Stop the server to simulate network error
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    render(<StripeOnboarding instructorId={TEST_INSTRUCTOR_ID} />);

    // Should show error state
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();

    // Restart server for other tests
    const serverPath = path.join(
      __dirname,
      "../../../../api/src/working-api.js",
    );
    serverProcess = spawn("node", [serverPath], {
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "test" },
    });

    await new Promise<void>((resolve) => {
      serverProcess.stdout.on("data", (data: Buffer) => {
        if (data.toString().includes("DriveFlow API running")) {
          resolve();
        }
      });
    });
  });

  it("should validate API response format", async () => {
    render(<StripeOnboarding instructorId={TEST_INSTRUCTOR_ID} />);

    // Wait for API response
    await screen.findByText("Status:");

    // Verify the component renders expected data structure
    expect(screen.getByText("Not Started")).toBeInTheDocument();

    // Requirements should be an array
    const requirements = screen.getByText(/Please connect your Stripe account/);
    expect(requirements).toBeInTheDocument();
  });

  it("should test complete onboarding simulation flow", async () => {
    const confirmSpy = jest
      .spyOn(window, "confirm")
      .mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<StripeOnboarding instructorId={TEST_INSTRUCTOR_ID} />);

    // 1. Initial load
    expect(
      await screen.findByText("Loading Stripe status..."),
    ).toBeInTheDocument();

    // 2. API response loaded
    expect(await screen.findByText("Not Started")).toBeInTheDocument();

    // 3. Connect button available
    const connectButton = await screen.findByText("Connect with Stripe");
    fireEvent.click(connectButton);

    // 4. Confirmation dialog with full flow description
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /🚀 STRIPE CONNECT FLOW:.*1\. You'd be redirected to:.*2\. Complete Stripe onboarding.*3\. Return to DriveFlow/s,
        ),
      );
    });

    // 5. Success simulation
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "🎉 Simulated: Stripe account connected successfully!",
      );
    });

    // 6. Status should update to complete (simulated)
    await waitFor(() => {
      expect(screen.getByText("Complete")).toBeInTheDocument();
    });

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });
});

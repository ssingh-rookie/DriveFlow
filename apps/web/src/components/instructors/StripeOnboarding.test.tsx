import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StripeOnboarding } from "./StripeOnboarding";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("StripeOnboarding", () => {
  const TEST_INSTRUCTOR_ID = "123ed673-79ac-41d6-81da-79de6829be4a";

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();

    // Mock successful API responses by default
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "Not Started",
          requirements: [
            "Please connect your Stripe account to receive payouts",
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          onboardingLink:
            "https://connect.stripe.com/express/onboarding?return_url=http%3A%2F%2Flocalhost%3A3000%2Fdashboard%2Finstructors%2F123ed673-79ac-41d6-81da-79de6829be4a%2Fpayouts%3Fstripe_onboarding%3Dsuccess",
        }),
      });
  });

  it("should render loading state initially", () => {
    render(<StripeOnboarding instructorId={TEST_INSTRUCTOR_ID} />);
    expect(screen.getByText("Loading Stripe status...")).toBeInTheDocument();
  });

  it("should fetch and display API data after loading", async () => {
    render(<StripeOnboarding instructorId={TEST_INSTRUCTOR_ID} />);

    // Wait for API call and status display
    expect(await screen.findByText("Status:")).toBeInTheDocument();
    expect(await screen.findByText("Not Started")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Please connect your Stripe account to receive payouts",
      ),
    ).toBeInTheDocument();

    // Verify API was called with correct URL
    expect(mockFetch).toHaveBeenCalledWith(
      `http://localhost:3001/api/payments/instructors/${TEST_INSTRUCTOR_ID}/payout-readiness`,
    );
  });

  it("should show Connect with Stripe button for non-complete status", async () => {
    render(<StripeOnboarding instructorId={TEST_INSTRUCTOR_ID} />);

    const connectButton = await screen.findByText("Connect with Stripe");
    expect(connectButton).toBeInTheDocument();
  });

  it("should show confirmation dialog and handle user choice", async () => {
    const confirmSpy = jest
      .spyOn(window, "confirm")
      .mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<StripeOnboarding instructorId={TEST_INSTRUCTOR_ID} />);

    const connectButton = await screen.findByText("Connect with Stripe");
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining("🚀 STRIPE CONNECT FLOW:"),
      );
    });

    // If user clicked OK, should show success simulation
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "🎉 Simulated: Stripe account connected successfully!",
      );
    });

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it("should handle API errors gracefully", async () => {
    mockFetch.mockReset();
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<StripeOnboarding instructorId={TEST_INSTRUCTOR_ID} />);

    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
    expect(await screen.findByText(/Network error/)).toBeInTheDocument();
  });

  it("should handle HTTP error responses", async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: "Instructor not found" }),
    });

    render(<StripeOnboarding instructorId={TEST_INSTRUCTOR_ID} />);

    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
    expect(
      await screen.findByText(/HTTP error! status: 404/),
    ).toBeInTheDocument();
  });

  it("should display complete status without connect button", async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "Complete",
        requirements: [],
      }),
    });

    render(<StripeOnboarding instructorId={TEST_INSTRUCTOR_ID} />);

    expect(await screen.findByText("Complete")).toBeInTheDocument();
    expect(
      await screen.findByText(/Your Stripe account is connected/),
    ).toBeInTheDocument();

    // Should not show connect button for complete status
    expect(screen.queryByText("Connect with Stripe")).not.toBeInTheDocument();
  });

  it("should handle return from Stripe onboarding", async () => {
    // Mock URL with stripe_onboarding=success parameter
    const mockLocation = {
      search: "?stripe_onboarding=success",
      pathname: "/dashboard/instructors/123/payouts",
    };
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
    });

    // Mock history.replaceState
    const replaceStateSpy = jest
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => {});

    render(<StripeOnboarding instructorId={TEST_INSTRUCTOR_ID} />);

    // Should show complete status without API call
    expect(await screen.findByText("Complete")).toBeInTheDocument();
    expect(replaceStateSpy).toHaveBeenCalledWith(
      {},
      expect.any(String),
      mockLocation.pathname,
    );

    replaceStateSpy.mockRestore();
  });
});

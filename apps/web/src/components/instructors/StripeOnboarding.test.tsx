import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StripeOnboarding } from "./StripeOnboarding";

describe("StripeOnboarding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing", () => {
    render(<StripeOnboarding instructorId="test-instructor" />);
    expect(screen.getByText("Loading Stripe status...")).toBeInTheDocument();
  });

  it("should display the mock status after loading", async () => {
    render(<StripeOnboarding instructorId="test-instructor" />);

    // Wait for loading to complete and mock data to load
    expect(await screen.findByText("Status:")).toBeInTheDocument();
    expect(await screen.findByText("Not Started")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Please connect your Stripe account to receive payouts",
      ),
    ).toBeInTheDocument();
  });

  it("should show Connect with Stripe button", async () => {
    render(<StripeOnboarding instructorId="test-instructor" />);

    const connectButton = await screen.findByText("Connect with Stripe");
    expect(connectButton).toBeInTheDocument();
  });

  it("should show alert when Connect button is clicked", async () => {
    // Mock window.alert and window.confirm
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    const confirmSpy = jest
      .spyOn(window, "confirm")
      .mockImplementation(() => false);

    render(<StripeOnboarding instructorId="test-instructor" />);

    const connectButton = await screen.findByText("Connect with Stripe");
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining("Real Stripe URL:"),
      );
    });

    alertSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  it("should display requirements section", async () => {
    render(<StripeOnboarding instructorId="test-instructor" />);

    expect(await screen.findByText("Requirements:")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Please connect your Stripe account to receive payouts",
      ),
    ).toBeInTheDocument();
  });
});

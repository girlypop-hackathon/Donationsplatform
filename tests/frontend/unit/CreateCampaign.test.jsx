import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CreateCampaign from "../../../Frontend/pages/CreateCampaign";
import { MemoryRouter } from "react-router-dom";

// Mock the navigation
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

describe("CreateCampaign Component - TDD Tests", () => {
  // Test 1: Component renders with all required fields
  test("should render create campaign form with all required fields", () => {
    render(
      <MemoryRouter>
        <CreateCampaign />
      </MemoryRouter>,
    );

    // Check main heading
    expect(screen.getByText("Create New Campaign")).toBeInTheDocument();

    // Check required fields are present
    expect(
      screen.getByLabelText("Organization/Provider *"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Campaign Title *")).toBeInTheDocument();
    expect(screen.getByLabelText("Funding Goal (DKK) *")).toBeInTheDocument();

    // Check optional fields are present
    expect(screen.getByLabelText("Campaign Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Campaign Image URL")).toBeInTheDocument();

    // Check milestone fields with percentage indicators
    expect(screen.getByLabelText("Milestone 1 (25%)")).toBeInTheDocument();
    expect(screen.getByLabelText("Milestone 2 (50%)")).toBeInTheDocument();
    expect(screen.getByLabelText("Milestone 3 (75%)")).toBeInTheDocument();

    // Check submit button
    expect(screen.getByText("Create Campaign")).toBeInTheDocument();
  });

  // Test 2: Default milestone values are set correctly
  test("should display default milestone values (25%, 50%, 75%)", () => {
    render(
      <MemoryRouter>
        <CreateCampaign />
      </MemoryRouter>,
    );

    const milestone1 = screen.getByLabelText("Milestone 1 (25%)");
    const milestone2 = screen.getByLabelText("Milestone 2 (50%)");
    const milestone3 = screen.getByLabelText("Milestone 3 (75%)");

    expect(milestone1).toHaveValue("25% of goal reached");
    expect(milestone2).toHaveValue("50% of goal reached");
    expect(milestone3).toHaveValue("75% of goal reached");
  });

  // Test 3: Milestone values are editable
  test("should allow editing of milestone values", () => {
    render(
      <MemoryRouter>
        <CreateCampaign />
      </MemoryRouter>,
    );

    const milestone1 = screen.getByLabelText("Milestone 1 (25%)");

    // Change the value
    fireEvent.change(milestone1, {
      target: { value: "Custom milestone text" },
    });

    expect(milestone1).toHaveValue("Custom milestone text");
  });

  // Test 4: Form validation - required fields
  test("should show error when submitting with missing required fields", async () => {
    render(
      <MemoryRouter>
        <CreateCampaign />
      </MemoryRouter>,
    );

    const submitButton = screen.getByText("Create Campaign");

    // Click submit without filling required fields
    fireEvent.click(submitButton);

    // Wait for error message to appear
    await waitFor(() => {
      expect(
        screen.getByText(
          "Provider, campaign bio, and goal amount are required",
        ),
      ).toBeInTheDocument();
    });
  });

  // Test 5: Goal amount validation
  test("should show error when goal amount is not a positive number", async () => {
    render(
      <MemoryRouter>
        <CreateCampaign />
      </MemoryRouter>,
    );

    // Fill provider and campaign bio (required fields)
    const providerSelect = screen.getByLabelText("Organization/Provider *");
    const campaignBio = screen.getByLabelText("Campaign Title *");
    const goalAmount = screen.getByLabelText("Funding Goal (DKK) *");

    fireEvent.change(providerSelect, { target: { value: "1" } });
    fireEvent.change(campaignBio, { target: { value: "Test Campaign" } });
    fireEvent.change(goalAmount, { target: { value: "-100" } }); // Invalid negative amount

    const submitButton = screen.getByText("Create Campaign");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Goal amount must be a positive number"),
      ).toBeInTheDocument();
    });
  });

  // Test 6: Form submission with valid data (mock API call)
  test("should attempt to submit form with valid data", async () => {
    // Mock fetch for API call
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { campaign_id: 1 },
          }),
      }),
    );

    render(
      <MemoryRouter>
        <CreateCampaign />
      </MemoryRouter>,
    );

    // Fill out the form with valid data
    const providerSelect = screen.getByLabelText("Organization/Provider *");
    const campaignBio = screen.getByLabelText("Campaign Title *");
    const goalAmount = screen.getByLabelText("Funding Goal (DKK) *");

    fireEvent.change(providerSelect, { target: { value: "1" } });
    fireEvent.change(campaignBio, { target: { value: "Test Campaign" } });
    fireEvent.change(goalAmount, { target: { value: "5000" } });

    const submitButton = screen.getByText("Create Campaign");
    fireEvent.click(submitButton);

    // Wait for success message
    await waitFor(() => {
      expect(
        screen.getByText("Campaign created successfully!"),
      ).toBeInTheDocument();
    });

    // Verify fetch was called with correct endpoint and method
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/campaigns"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    // Clean up
    global.fetch.mockClear();
    delete global.fetch;
  });

  // Test 7: Error handling for API failures
  test("should show error message when API call fails", async () => {
    // Mock failed fetch
    global.fetch = jest.fn(() => Promise.reject(new Error("Network error")));

    render(
      <MemoryRouter>
        <CreateCampaign />
      </MemoryRouter>,
    );

    // Fill out form
    const providerSelect = screen.getByLabelText("Organization/Provider *");
    const campaignBio = screen.getByLabelText("Campaign Title *");
    const goalAmount = screen.getByLabelText("Funding Goal (DKK) *");

    fireEvent.change(providerSelect, { target: { value: "1" } });
    fireEvent.change(campaignBio, { target: { value: "Test Campaign" } });
    fireEvent.change(goalAmount, { target: { value: "5000" } });

    const submitButton = screen.getByText("Create Campaign");
    fireEvent.click(submitButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText("Failed to create campaign")).toBeInTheDocument();
    });

    // Clean up
    global.fetch.mockClear();
    delete global.fetch;
  });
});

export {};

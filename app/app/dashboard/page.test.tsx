import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import DashboardPage from "@/app/dashboard/page";

describe("DashboardPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the placeholder dashboard sections", () => {
    render(<DashboardPage />);

    expect(
      screen.getByRole("heading", { name: "AI visibility and hallucination monitoring" }),
    ).toBeInTheDocument();
    expect(screen.getByText("AI visibility score")).toBeInTheDocument();
    expect(screen.getByText("Hallucinations detected")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Share of voice trend" })).toBeInTheDocument();
    expect(screen.getByLabelText("Share of voice trend chart")).toBeInTheDocument();
    expect(screen.getByText("Schema markup added")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Share of voice - AI recommendations" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Active hallucination alerts" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Top influencing domains" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Category visibility breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fix weak categories" })).toBeInTheDocument();
  });
});
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchParams: { get: (key: string) => key === "section" ? "gmail" : null },
  troop: {
    _id: "troop-1",
    name: "Test troop",
    number: "1",
    type: "scouts",
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ troopId: "troop-1" }),
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: () => mocks.troop,
}));

vi.mock("../../src/components/GmailSettings", () => ({
  default: () => (
    <form aria-label="Gmail SMTP connection">
      <button type="submit">Connect</button>
    </form>
  ),
}));

import TroopSettingsPage from "../../src/app/(dashboard)/settings/[troopId]/page";

describe("Gmail settings layout", () => {
  it("renders the SMTP form outside the troop settings form", async () => {
    render(<TroopSettingsPage />);

    await screen.findByRole("form", { name: "Gmail SMTP connection" });
    await waitFor(() => expect(document.querySelectorAll("form")).toHaveLength(1));
    expect(document.querySelector("form form")).not.toBeInTheDocument();
  });
});

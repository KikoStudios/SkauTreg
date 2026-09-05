import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicTroopBadges from "../../src/components/PublicTroopBadges";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock("convex/react", () => ({
  useConvex: () => ({ query: queryMock }),
}));

describe("PublicTroopBadges", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("renders the static badges when Convex is unavailable", async () => {
    queryMock.mockRejectedValue(new Error("Convex deployment disabled"));

    render(<PublicTroopBadges />);

    expect(screen.getByAltText("Roveři")).toBeInTheDocument();
    expect(screen.getByAltText("Vedoucí")).toBeInTheDocument();
    expect(screen.getByAltText("Vlastník")).toBeInTheDocument();
    await waitFor(() => expect(queryMock).toHaveBeenCalledOnce());
  });

  it("renders public troop data when Convex is healthy", async () => {
    queryMock.mockResolvedValue([
      { _id: "troop-1", name: "Testovací oddíl", logo: null },
    ]);

    render(<PublicTroopBadges />);

    expect(await screen.findByLabelText("Testovací oddíl")).toHaveTextContent(
      "TO",
    );
  });
});

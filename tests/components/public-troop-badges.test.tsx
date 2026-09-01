import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PublicTroopBadges from "../../src/components/PublicTroopBadges";

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock("convex/react", () => ({ useQuery: useQueryMock }));

describe("PublicTroopBadges", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it("renders the static badges when Convex is unavailable", () => {
    useQueryMock.mockImplementation(() => {
      throw new Error("Convex deployment disabled");
    });

    render(<PublicTroopBadges />);

    expect(screen.getByAltText("Roveři")).toBeInTheDocument();
    expect(screen.getByAltText("Vedoucí")).toBeInTheDocument();
    expect(screen.getByAltText("Vlastník")).toBeInTheDocument();
  });

  it("renders public troop data when Convex is healthy", () => {
    useQueryMock.mockReturnValue([
      { _id: "troop-1", name: "Testovací oddíl", logo: null },
    ]);

    render(<PublicTroopBadges />);

    expect(screen.getByLabelText("Testovací oddíl")).toHaveTextContent("TO");
  });
});

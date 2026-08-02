import { describe, expect, it } from "vitest";
import { resolveAttendanceSummary } from "../../src/lib/tripAttendance";

describe("trip dashboard compatibility", () => {
  it("uses the additive attendance summary when available", () => {
    expect(resolveAttendanceSummary({ attendanceSummary: { attending: 2, notAttending: 1, pending: 3, total: 6 } })).toEqual({
      attending: 2,
      notAttending: 1,
      pending: 3,
      total: 6,
    });
  });

  it("does not crash while an older Convex response is still active", () => {
    expect(resolveAttendanceSummary({ participants: [
      { participation: { status: "attending" } },
      { status: "pending" },
    ] })).toEqual({ attending: 1, notAttending: 0, pending: 1, total: 2 });
    expect(resolveAttendanceSummary({})).toEqual({ attending: 0, notAttending: 0, pending: 0, total: 0 });
  });
});

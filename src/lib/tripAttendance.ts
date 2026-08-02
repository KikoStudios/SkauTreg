export type AttendanceSummary = {
  attending: number;
  notAttending: number;
  pending: number;
  total?: number;
};

export function resolveAttendanceSummary(dashboard: unknown): AttendanceSummary {
  if (!dashboard || typeof dashboard !== "object") return { attending: 0, notAttending: 0, pending: 0 };
  const value = dashboard as { attendanceSummary?: Partial<AttendanceSummary>; participants?: unknown[] };
  if (value.attendanceSummary) {
    return {
      attending: Number(value.attendanceSummary.attending) || 0,
      notAttending: Number(value.attendanceSummary.notAttending) || 0,
      pending: Number(value.attendanceSummary.pending) || 0,
      total: Number(value.attendanceSummary.total) || undefined,
    };
  }
  const participants = Array.isArray(value.participants) ? value.participants : [];
  const statusOf = (participant: unknown) => {
    if (!participant || typeof participant !== "object") return undefined;
    const row = participant as { status?: string; participation?: { status?: string } };
    return row.participation?.status ?? row.status;
  };
  return {
    attending: participants.filter((participant) => statusOf(participant) === "attending").length,
    notAttending: participants.filter((participant) => statusOf(participant) === "not_attending").length,
    pending: participants.filter((participant) => statusOf(participant) === "pending").length,
    total: participants.length,
  };
}

export function normalizeLeaderRole(role?: string | null): string | null {
  if (!role) return null;
  if (role === "vedouci") return "leader";
  return role;
}

export function normalizeMemberContactFields<T extends Record<string, any> | null | undefined>(
  member: T,
): T {
  if (!member) return member;

  return {
    ...member,
    guardianName: member.guardianName || member.parentName || "",
    guardianPhone: member.guardianPhone || member.parentPhone || "",
    guardianEmail: member.guardianEmail || "",
    guardian2Name: member.guardian2Name || member.parent2Name || "",
    guardian2Phone: member.guardian2Phone || member.parent2Phone || "",
    guardian2Email: member.guardian2Email || member.parent2Email || "",
  };
}

export function getMemberEmailTargets(member: Record<string, any> | null | undefined): string[] {
  if (!member) return [];

  const normalized = normalizeMemberContactFields(member);
  const emails = [
    normalized.email,
    normalized.guardianEmail,
    normalized.guardian2Email,
  ];

  return Array.from(
    new Set(
      emails
        .map((email) => (typeof email === "string" ? email.trim().toLowerCase() : ""))
        .filter(Boolean),
    ),
  );
}

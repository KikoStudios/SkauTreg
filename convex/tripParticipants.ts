import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authError, requireTripLeader, requireTripViewer } from "./lib/auth";
import { generateSecureToken } from "./lib/tokens";
import { normalizeMemberContactFields } from "./lib/memberEmails";

type Answers = Record<string, unknown>;

function parseAnswers(value: unknown): Answers {
  let parsed = value;
  for (let attempt = 0; attempt < 3 && typeof parsed === "string"; attempt += 1) {
    try { parsed = JSON.parse(parsed); } catch { return {}; }
  }
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Answers : {};
}

function displayValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Ano" : "Ne";
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").join(", ").slice(0, 2_000);
  if (typeof value === "string" || typeof value === "number") return String(value).slice(0, 2_000);
  return "—";
}

function legacyActive(expiresAt?: string) {
  if (!expiresAt) return false;
  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) && timestamp >= Date.now();
}

export const getSummary = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    await requireTripViewer(ctx, args.tripId);
    const rows = await ctx.db.query("participations").withIndex("by_trip", (q) => q.eq("tripId", args.tripId)).collect();
    return {
      total: rows.length,
      attending: rows.filter((row) => row.status === "attending").length,
      notAttending: rows.filter((row) => row.status === "not_attending").length,
      pending: rows.filter((row) => row.status !== "attending" && row.status !== "not_attending").length,
    };
  },
});

export const list = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const { trip } = await requireTripLeader(ctx, args.tripId);
    const rows = await ctx.db.query("participations").withIndex("by_trip", (q) => q.eq("tripId", args.tripId)).collect();
    return await Promise.all(rows.map(async (row) => {
      const member = normalizeMemberContactFields(await ctx.db.get(row.memberId));
      if (!member) return null;
      const answers = parseAnswers(row.responses);
      return {
        participationId: row._id,
        memberId: member._id,
        name: member.name,
        primaryEmail: member.email || member.guardianEmail,
        guardianContacts: [
          member.guardianEmail ? { label: member.guardianName || "Rodič / zástupce", email: member.guardianEmail } : null,
          member.guardian2Email ? { label: member.guardian2Name || "Druhý rodič / zástupce", email: member.guardian2Email } : null,
        ].filter((contact): contact is { label: string; email: string } => contact !== null),
        status: row.status === "attending" || row.status === "not_attending" ? row.status : "pending",
        answers: (trip.customFields || []).map((field, index) => ({
          fieldId: `${index}:${field.label}`,
          label: field.label,
          displayValue: displayValue(answers[field.label]),
        })),
        hasSecureLink: Boolean(row.secureAccessKey),
        legacyLinkActive: legacyActive(row.legacyAccessExpiresAt),
      };
    })).then((items) => items.filter((item) => item !== null));
  },
});

export const getCapabilityUrl = mutation({
  args: { participationId: v.id("participations") },
  handler: async (ctx, args) => {
    const participation = await ctx.db.get(args.participationId);
    if (!participation) authError("NOT_FOUND", "Účastník nebyl nalezen.");
    await requireTripLeader(ctx, participation.tripId);
    if (!participation.secureAccessKey) authError("NOT_FOUND", "Bezpečný odkaz zatím nebyl vytvořen.");
    const origin = (process.env.APP_ORIGIN || "").replace(/\/$/, "");
    return { url: origin ? `${origin}/rsvp/${participation.secureAccessKey}` : `/rsvp/${participation.secureAccessKey}` };
  },
});

export const regenerateCapability = mutation({
  args: { participationId: v.id("participations") },
  handler: async (ctx, args) => {
    const participation = await ctx.db.get(args.participationId);
    if (!participation) authError("NOT_FOUND", "Účastník nebyl nalezen.");
    await requireTripLeader(ctx, participation.tripId);
    const secureAccessKey = generateSecureToken();
    await ctx.db.patch(participation._id, { secureAccessKey });
    const origin = (process.env.APP_ORIGIN || "").replace(/\/$/, "");
    return { url: origin ? `${origin}/rsvp/${secureAccessKey}` : `/rsvp/${secureAccessKey}` };
  },
});

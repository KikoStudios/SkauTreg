import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { authError, requireTripLeader } from "./lib/auth";
import { generateSecureToken } from "./lib/tokens";

function todayInPrague() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isExpired(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return todayInPrague() > value;
  const timestamp = Date.parse(value);
  return !Number.isFinite(timestamp) || timestamp < Date.now();
}

async function uniqueSlug(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const slug = generateSecureToken();
    const existing = await ctx.db
      .query("trip_ticket_shares")
      .withIndex("by_share_slug", (q) => q.eq("shareSlug", slug))
      .unique();
    if (!existing) return slug;
  }
  authError("VALIDATION_ERROR", "Nepodařilo se vytvořit bezpečný odkaz.");
}

async function validateTickets(
  ctx: MutationCtx,
  tripId: Id<"trips">,
  ticketIds: Id<"transport_tickets">[],
) {
  if (ticketIds.length < 1) authError("VALIDATION_ERROR", "Vyberte alespoň jednu jízdenku.");
  if (ticketIds.length > 100) authError("VALIDATION_ERROR", "Nelze sdílet více než 100 jízdenek.");
  const unique = [...new Set(ticketIds)];
  if (unique.length !== ticketIds.length) authError("VALIDATION_ERROR", "Výběr obsahuje duplicitní jízdenky.");
  const tickets = await Promise.all(unique.map((id) => ctx.db.get(id)));
  if (tickets.some((ticket) => !ticket || ticket.tripId !== tripId)) {
    authError("VALIDATION_ERROR", "Vybraná jízdenka nepatří k této výpravě.");
  }
  return tickets as Doc<"transport_tickets">[];
}

function publicParsed(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const stringValue = (key: string, max = 160) =>
    typeof source[key] === "string" ? source[key].slice(0, max) : undefined;
  return {
    ticketCode: stringValue("ticketCode", 80),
    from: stringValue("from"),
    to: stringValue("to"),
    departDate: stringValue("departDate", 20),
    departTime: stringValue("departTime", 20),
    arriveDate: stringValue("arriveDate", 20),
    arriveTime: stringValue("arriveTime", 20),
    platform: stringValue("platform", 40),
    seat: stringValue("seat", 80),
    service: stringValue("service", 80),
  };
}

export const getForManagement = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    await requireTripLeader(ctx, args.tripId);
    return await ctx.db
      .query("trip_ticket_shares")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .unique();
  },
});

export const createOrUpdate = mutation({
  args: {
    tripId: v.id("trips"),
    selectedTicketIds: v.array(v.id("transport_tickets")),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, trip } = await requireTripLeader(ctx, args.tripId);
    await validateTickets(ctx, args.tripId, args.selectedTicketIds);
    const existing = await ctx.db
      .query("trip_ticket_shares")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .unique();
    const now = new Date().toISOString();
    const expiresAt = args.expiresAt || trip.endDate || trip.startDate;
    if (!expiresAt || isExpired(expiresAt)) authError("VALIDATION_ERROR", "Platnost odkazu musí být v budoucnosti.");
    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: true,
        selectedTicketIds: args.selectedTicketIds,
        expiresAt,
        updatedAt: now,
        updatedBy: user._id,
        revokedAt: undefined,
      });
      return { shareSlug: existing.shareSlug };
    }
    const shareSlug = await uniqueSlug(ctx);
    await ctx.db.insert("trip_ticket_shares", {
      tripId: args.tripId,
      shareSlug,
      enabled: true,
      selectedTicketIds: args.selectedTicketIds,
      expiresAt,
      createdAt: now,
      createdBy: user._id,
      updatedAt: now,
      updatedBy: user._id,
    });
    return { shareSlug };
  },
});

export const rotate = mutation({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const { user } = await requireTripLeader(ctx, args.tripId);
    const share = await ctx.db
      .query("trip_ticket_shares")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .unique();
    if (!share) authError("NOT_FOUND", "Sdílení nebylo nalezeno.");
    const shareSlug = await uniqueSlug(ctx);
    await ctx.db.patch(share._id, { shareSlug, enabled: true, revokedAt: undefined, updatedAt: new Date().toISOString(), updatedBy: user._id });
    return { shareSlug };
  },
});

export const revoke = mutation({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const { user } = await requireTripLeader(ctx, args.tripId);
    const share = await ctx.db
      .query("trip_ticket_shares")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .unique();
    if (!share) return { ok: true };
    const now = new Date().toISOString();
    await ctx.db.patch(share._id, { enabled: false, revokedAt: now, updatedAt: now, updatedBy: user._id });
    return { ok: true };
  },
});

export const getPublic = query({
  args: { shareSlug: v.string() },
  handler: async (ctx, args) => {
    if (args.shareSlug.length < 32 || args.shareSlug.length > 64) return { status: "not_found" as const };
    const share = await ctx.db
      .query("trip_ticket_shares")
      .withIndex("by_share_slug", (q) => q.eq("shareSlug", args.shareSlug))
      .unique();
    if (!share) return { status: "not_found" as const };
    if (!share.enabled || share.revokedAt) return { status: "revoked" as const };
    if (isExpired(share.expiresAt)) return { status: "expired" as const };
    const trip = await ctx.db.get(share.tripId);
    if (!trip) return { status: "not_found" as const };
    const selected = await Promise.all(share.selectedTicketIds.map((id) => ctx.db.get(id)));
    const tickets = await Promise.all(selected
      .filter((ticket): ticket is Doc<"transport_tickets"> => Boolean(ticket && ticket.tripId === share.tripId))
      .map(async (ticket) => ({
        name: ticket.name.slice(0, 160),
        contentType: ticket.contentType,
        parsed: publicParsed(ticket.parsed),
        url: await ctx.storage.getUrl(ticket.storageId),
      })));
    return {
      status: "active" as const,
      expiresAt: share.expiresAt,
      trip: { name: trip.name, location: trip.location, startDate: trip.startDate, endDate: trip.endDate },
      tickets,
    };
  },
});

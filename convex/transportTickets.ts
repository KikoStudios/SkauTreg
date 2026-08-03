import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireTripLeader, requireTripViewer } from "./lib/auth";
import { generateSecureToken } from "./lib/tokens";

async function generateUniqueShareSlug(ctx: MutationCtx): Promise<string> {
  for (let i = 0; i < 15; i++) {
    const slug = generateSecureToken();
    const existing = await ctx.db
      .query("transport_tickets")
      .withIndex("by_share_slug", (q) => q.eq("shareSlug", slug))
      .first();
    if (!existing) return slug;
  }
  throw new Error("Failed to generate unique share slug");
}

export const generateUploadUrl = mutation({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    await requireTripLeader(ctx, args.tripId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const listByTrip = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    await requireTripViewer(ctx, args.tripId);
    const files = await ctx.db
      .query("transport_tickets")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();

    return await Promise.all(
      files.map(async (f) => {
        const url = await ctx.storage.getUrl(f.storageId);
        return { ...f, url };
      })
    );
  },
});

export const listByRoute = query({
  args: { routeId: v.id("transport_routes") },
  handler: async (ctx, args) => {
    const route = await ctx.db.get(args.routeId);
    if (!route) return [];
    await requireTripViewer(ctx, route.tripId);
    const files = await ctx.db
      .query("transport_tickets")
      .withIndex("by_route", (q) => q.eq("routeId", args.routeId))
      .collect();

    return await Promise.all(
      files.map(async (f) => {
        const url = await ctx.storage.getUrl(f.storageId);
        return { ...f, url };
      })
    );
  },
});

export const upload = mutation({
  args: {
    tripId: v.id("trips"),
    routeId: v.optional(v.id("transport_routes")),
    storageId: v.string(),
    name: v.string(),
    contentType: v.string(),
    parsed: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await requireTripLeader(ctx, args.tripId);
    if (args.routeId) {
      const route = await ctx.db.get(args.routeId);
      if (!route || route.tripId !== args.tripId) throw new Error("Route does not belong to this trip");
    }
    const now = new Date().toISOString();
    return await ctx.db.insert("transport_tickets", {
      tripId: args.tripId,
      routeId: args.routeId,
      storageId: args.storageId,
      name: args.name,
      contentType: args.contentType,
      parsed: args.parsed,
      shareEnabled: false,
      shareUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const enableShare = mutation({
  args: {
    ticketId: v.id("transport_tickets"),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");
    const { trip } = await requireTripLeader(ctx, ticket.tripId);

    const shareSlug = ticket.shareSlug || (await generateUniqueShareSlug(ctx));
    await ctx.db.patch(args.ticketId, {
      shareEnabled: true,
      shareSlug,
      shareExpiresAt: args.expiresAt ?? trip.endDate ?? trip.startDate,
      shareUpdatedAt: now,
      updatedAt: now,
    });
    return { shareSlug };
  },
});

export const disableShare = mutation({
  args: { ticketId: v.id("transport_tickets") },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");
    await requireTripLeader(ctx, ticket.tripId);
    await ctx.db.patch(args.ticketId, { shareEnabled: false, updatedAt: now });
    return { ok: true };
  },
});

export const regenerateShareSlug = mutation({
  args: {
    ticketId: v.id("transport_tickets"),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");
    const { trip } = await requireTripLeader(ctx, ticket.tripId);

    const shareSlug = await generateUniqueShareSlug(ctx);
    await ctx.db.patch(args.ticketId, {
      shareEnabled: true,
      shareSlug,
      shareExpiresAt: args.expiresAt ?? ticket.shareExpiresAt ?? trip.endDate ?? trip.startDate,
      shareUpdatedAt: now,
      updatedAt: now,
    });
    return { shareSlug };
  },
});

export const updatePriceOverview = mutation({
  args: {
    ticketId: v.id("transport_tickets"),
    kidUnitCzk: v.optional(v.number()),
    adultUnitCzk: v.optional(v.number()),
    studentUnitCzk: v.optional(v.number()),
    kidCount: v.optional(v.number()),
    adultCount: v.optional(v.number()),
    studentCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");
    await requireTripLeader(ctx, ticket.tripId);

    await ctx.db.patch(args.ticketId, {
      priceOverview: {
        kidUnitCzk: args.kidUnitCzk,
        adultUnitCzk: args.adultUnitCzk,
        studentUnitCzk: args.studentUnitCzk,
        kidCount: args.kidCount,
        adultCount: args.adultCount,
        studentCount: args.studentCount,
      },
      updatedAt: now,
    });
    return { ok: true };
  },
});

export const authorizeParsing = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    await requireTripLeader(ctx, args.tripId);
    return true;
  },
});

export const updateParsed = mutation({
  args: {
    ticketId: v.id("transport_tickets"),
    parsed: v.any(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");
    await requireTripLeader(ctx, ticket.tripId);
    await ctx.db.patch(args.ticketId, {
      parsed: args.parsed,
      updatedAt: new Date().toISOString(),
    });
    return { ok: true };
  },
});

export const remove = mutation({
  args: { ticketId: v.id("transport_tickets") },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) return;
    await requireTripLeader(ctx, ticket.tripId);
    await ctx.storage.delete(ticket.storageId);
    await ctx.db.delete(args.ticketId);
  },
});

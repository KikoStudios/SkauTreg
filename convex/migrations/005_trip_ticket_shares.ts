import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { generateSecureToken } from "../lib/tokens";

export const backfillTripTicketShares = internalMutation({
  args: { cursor: v.union(v.string(), v.null()), numItems: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("trips").paginate({
      cursor: args.cursor,
      numItems: Math.min(Math.max(args.numItems ?? 50, 1), 100),
    });
    let created = 0;
    for (const trip of page.page) {
      const existing = await ctx.db.query("trip_ticket_shares").withIndex("by_trip", (q) => q.eq("tripId", trip._id)).unique();
      if (existing) continue;
      const tickets = await ctx.db.query("transport_tickets").withIndex("by_trip", (q) => q.eq("tripId", trip._id)).collect();
      const explicitlyShared = tickets.filter((ticket) => ticket.shareEnabled === true);
      if (!explicitlyShared.length) continue;
      const troop = await ctx.db.get(trip.troopId);
      if (!troop) continue;
      const now = new Date().toISOString();
      await ctx.db.insert("trip_ticket_shares", {
        tripId: trip._id,
        shareSlug: generateSecureToken(),
        enabled: true,
        selectedTicketIds: explicitlyShared.map((ticket) => ticket._id),
        expiresAt: trip.endDate || trip.startDate,
        createdAt: now,
        createdBy: troop.ownerId,
        updatedAt: now,
        updatedBy: troop.ownerId,
      });
      created += 1;
    }
    return { created, continueCursor: page.continueCursor, isDone: page.isDone };
  },
});
